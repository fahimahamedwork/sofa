package main

import (
        "context"
        "fmt"
        "log"
        "net/http"
        "os"
        "os/signal"
        "syscall"
        "time"

        "github.com/gin-gonic/gin"
        "go.uber.org/zap"
        "gorm.io/driver/sqlite"
        "gorm.io/gorm"
        "gorm.io/gorm/logger"

        "github.com/sofa/sofa-backend/internal/config"
        "github.com/sofa/sofa-backend/internal/crypto"
        "github.com/sofa/sofa-backend/internal/deploy"
        "github.com/sofa/sofa-backend/internal/docker"
        "github.com/sofa/sofa-backend/internal/handler"
        "github.com/sofa/sofa-backend/internal/middleware"
        "github.com/sofa/sofa-backend/internal/model"
        "github.com/sofa/sofa-backend/internal/proxy"
        "github.com/sofa/sofa-backend/internal/queue"
        "github.com/sofa/sofa-backend/internal/realtime"
        "github.com/sofa/sofa-backend/internal/repository"
        "github.com/sofa/sofa-backend/internal/service"

        // PostgreSQL driver - used when PG is available via DSN
        "gorm.io/driver/postgres"
)

func main() {
        // Load configuration
        cfg, err := config.Load()
        if err != nil {
                log.Fatalf("Failed to load config: %v", err)
        }

        // Initialize logger
        zapLogger, err := zap.NewProduction()
        if err != nil {
                log.Fatalf("Failed to initialize logger: %v", err)
        }
        defer zapLogger.Sync()

        // Connect to database
        db, err := connectDatabase(cfg)
        if err != nil {
                log.Fatalf("Failed to connect to database: %v", err)
        }

        // Auto-migrate models
        if err := autoMigrate(db); err != nil {
                log.Fatalf("Failed to auto-migrate: %v", err)
        }
        zapLogger.Info("Database migration completed")

        // Initialize encryptor
        encryptor, err := crypto.NewEncryptor(cfg.Auth.JWTSecret)
        if err != nil {
                log.Fatalf("Failed to initialize encryptor: %v", err)
        }

        // Initialize repositories
        appRepo := repository.NewAppRepo(db)
        deployRepo := repository.NewDeploymentRepo(db)
        envVarRepo := repository.NewEnvVarRepo(db)
        domainRepo := repository.NewDomainRepo(db)
        volumeRepo := repository.NewVolumeRepo(db)
        databaseRepo := repository.NewDatabaseRepo(db)
        cronJobRepo := repository.NewCronJobRepo(db)
        settingRepo := repository.NewSettingRepo(db)
        sshKeyRepo := repository.NewSSHKeyRepo(db)

        // Initialize WebSocket hub (must be before pipeline and deploy service)
        hub := realtime.NewHub()
        go hub.Run()

        // Initialize Traefik manager
        traefikManager := proxy.NewTraefikManager(cfg.Traefik.APIURL, cfg.Traefik.BaseDomain)
        _ = traefikManager // Used by deploy pipeline and domain service

        // Initialize Docker client (must be before pipeline)
        var dockerClient *docker.DockerClient
        dockerClient, err = docker.NewDockerClient(cfg.Docker.SocketPath)
        if err != nil {
                zapLogger.Warn("Docker daemon not available, deploy functionality disabled", zap.Error(err))
        }

        // Initialize deploy pipeline (depends on dockerClient, repos, hub, encryptor)
        var pipeline *deploy.Pipeline
        if dockerClient != nil {
                pipeline = deploy.NewPipeline(dockerClient, deployRepo, appRepo, envVarRepo, domainRepo, hub, encryptor, cfg.Docker.NetworkName)
        } else {
                pipeline = deploy.NewPipeline(nil, deployRepo, appRepo, envVarRepo, domainRepo, hub, encryptor, cfg.Docker.NetworkName)
        }

        // Try to initialize asynq queue client (depends on Redis)
        queueClient, qerr := queue.NewClient(
                cfg.Redis.Addr(),
                cfg.Redis.Password,
                cfg.Redis.DB,
        )
        if qerr != nil {
                zapLogger.Warn("Failed to connect to Redis, queue disabled", zap.Error(qerr))
        }
        if queueClient != nil {
                defer queueClient.Close()
        }

        // Try to initialize asynq worker (depends on pipeline, repos, hub)
        worker := queue.NewWorker(
                cfg.Redis.Addr(),
                cfg.Redis.Password,
                cfg.Redis.DB,
                pipeline,
                deployRepo,
                appRepo,
                databaseRepo,
                domainRepo,
                cronJobRepo,
                hub,
        )
        go func() {
                if err := worker.Start(); err != nil {
                        zapLogger.Warn("Worker failed to start", zap.Error(err))
                }
        }()

        // Initialize services (depends on repos, pipeline, queueClient, hub)
        appService := service.NewAppService(appRepo, deployRepo, envVarRepo, domainRepo, volumeRepo, databaseRepo, cronJobRepo)
        deployService := service.NewDeployService(deployRepo, appRepo, pipeline, queueClient, hub)
        envVarService := service.NewEnvVarService(envVarRepo, encryptor)
        domainService := service.NewDomainService(domainRepo, appRepo, cfg.Traefik.BaseDomain)
        databaseService := service.NewDatabaseService(databaseRepo, encryptor)
        settingService := service.NewSettingService(settingRepo)
        volumeService := service.NewVolumeService(volumeRepo)
        sshKeyService := service.NewSSHKeyService(sshKeyRepo)

        // Initialize handlers
        authHandler := handler.NewAuthHandler(cfg, settingService)
        appHandler := handler.NewAppHandler(appService)
        deployHandler := handler.NewDeploymentHandler(deployService)
        envVarHandler := handler.NewEnvVarHandler(envVarService)
        domainHandler := handler.NewDomainHandler(domainService)
        dbHandler := handler.NewDatabaseHandler(databaseService)
        volumeHandler := handler.NewVolumeHandler(volumeService)
        metricHandler := handler.NewMetricHandler(appService)
        settingHandler := handler.NewSettingHandler(settingService, sshKeyService)

        // Set up Gin router
        if os.Getenv("GIN_MODE") == "" {
                gin.SetMode(gin.ReleaseMode)
        }

        r := gin.New()
        r.Use(gin.Recovery())
        r.Use(middleware.CORSConfig())
        r.Use(middleware.Logger(zapLogger))

        // Register all routes
        handler.RegisterRoutes(
                r,
                cfg,
                authHandler,
                appHandler,
                deployHandler,
                envVarHandler,
                domainHandler,
                dbHandler,
                volumeHandler,
                metricHandler,
                settingHandler,
        )

        // WebSocket endpoint
        r.GET("/ws", func(c *gin.Context) {
                realtime.ServeWS(hub, c.Writer, c.Request)
        })

        // Start server
        addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
        srv := &http.Server{
                Addr:    addr,
                Handler: r,
        }

        // Graceful shutdown
        go func() {
                zapLogger.Info("Starting server", zap.String("addr", addr))
                if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
                        zapLogger.Fatal("Server failed to start", zap.Error(err))
                }
        }()

        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit

        zapLogger.Info("Shutting down server...")

        ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
        defer cancel()

        if err := srv.Shutdown(ctx); err != nil {
                zapLogger.Fatal("Server forced to shutdown", zap.Error(err))
        }

        zapLogger.Info("Server exited gracefully")
}

func connectDatabase(cfg *config.Config) (*gorm.DB, error) {
        gormLogger := logger.New(
                log.New(os.Stdout, "\r\n", log.LstdFlags),
                logger.Config{
                        SlowThreshold:             time.Second,
                        LogLevel:                  logger.Warn,
                        IgnoreRecordNotFoundError: true,
                        Colorful:                  true,
                },
        )

        // Try PostgreSQL with retries (containers may still be starting)
        dsn := cfg.Database.DSN()
        var db *gorm.DB
        var err error

        maxRetries := 10
        for i := 1; i <= maxRetries; i++ {
                db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
                        Logger: gormLogger,
                })
                if err == nil {
                        log.Printf("PostgreSQL connected successfully (attempt %d/%d)", i, maxRetries)
                        break
                }
                log.Printf("PostgreSQL not ready yet (attempt %d/%d): %v", i, maxRetries, err)
                if i < maxRetries {
                        time.Sleep(3 * time.Second)
                }
        }

        if err != nil {
                log.Printf("PostgreSQL not available after %d retries (%v), falling back to SQLite", maxRetries, err)

                db, err = gorm.Open(sqlite.Open("sofa.db"), &gorm.Config{
                        Logger: gormLogger,
                })
                if err != nil {
                        return nil, fmt.Errorf("failed to connect to SQLite: %w", err)
                }
        }

        sqlDB, err := db.DB()
        if err != nil {
                return nil, fmt.Errorf("getting DB instance: %w", err)
        }

        sqlDB.SetMaxIdleConns(10)
        sqlDB.SetMaxOpenConns(100)
        sqlDB.SetConnMaxLifetime(time.Hour)

        return db, nil
}

func autoMigrate(db *gorm.DB) error {
        return db.AutoMigrate(
                &model.App{},
                &model.Deployment{},
                &model.EnvVar{},
                &model.Domain{},
                &model.Volume{},
                &model.Database{},
                &model.CronJob{},
                &model.Setting{},
                &model.SSHKey{},
        )
}
