package queue

import (
        "context"
        "encoding/json"
        "fmt"
        "log"
        "time"

        "github.com/hibiken/asynq"
        "github.com/sofa/sofa-backend/internal/deploy"
        "github.com/sofa/sofa-backend/internal/realtime"
        "github.com/sofa/sofa-backend/internal/repository"
)

const (
        TaskTypeDeploy         = "deploy"
        TaskTypeDBProvision    = "db:provision"
        TaskTypeSSLCertificate = "ssl:certificate"
        TaskTypeCronJob        = "cron:run"
)

type DeployPayload struct {
        AppID        uint64 `json:"app_id"`
        DeploymentID uint64 `json:"deployment_id"`
}

type DBProvisionPayload struct {
        AppID      uint64 `json:"app_id"`
        DatabaseID uint64 `json:"database_id"`
        DBType     string `json:"db_type"`
}

type SSLCertificatePayload struct {
        DomainID uint64 `json:"domain_id"`
        Domain   string `json:"domain"`
}

type CronJobPayload struct {
        JobID uint64 `json:"job_id"`
        AppID uint64 `json:"app_id"`
}

// Client is the asynq client for enqueueing tasks
type Client struct {
        client *asynq.Client
}

func NewClient(redisAddr, redisPassword string, redisDB int) (*Client, error) {
        client := asynq.NewClient(asynq.RedisClientOpt{
                Addr:     redisAddr,
                Password: redisPassword,
                DB:       redisDB,
        })
        return &Client{client: client}, nil
}

func (c *Client) EnqueueDeploy(appID, deploymentID uint64) error {
        payload, err := json.Marshal(DeployPayload{
                AppID:        appID,
                DeploymentID: deploymentID,
        })
        if err != nil {
                return fmt.Errorf("marshaling deploy payload: %w", err)
        }

        task := asynq.NewTask(TaskTypeDeploy, payload)
        info, err := c.client.Enqueue(task, asynq.Queue("deploy"), asynq.MaxRetry(3))
        if err != nil {
                return fmt.Errorf("enqueuing deploy task: %w", err)
        }

        log.Printf("Enqueued deploy task: app=%d deployment=%d queue_id=%s", appID, deploymentID, info.ID)
        return nil
}

func (c *Client) EnqueueDBProvision(appID, databaseID uint64, dbType string) error {
        payload, err := json.Marshal(DBProvisionPayload{
                AppID:      appID,
                DatabaseID: databaseID,
                DBType:     dbType,
        })
        if err != nil {
                return fmt.Errorf("marshaling db provision payload: %w", err)
        }

        task := asynq.NewTask(TaskTypeDBProvision, payload)
        info, err := c.client.Enqueue(task, asynq.Queue("default"), asynq.MaxRetry(3))
        if err != nil {
                return fmt.Errorf("enqueuing db provision task: %w", err)
        }

        log.Printf("Enqueued DB provision task: app=%d db=%d queue_id=%s", appID, databaseID, info.ID)
        return nil
}

func (c *Client) EnqueueSSLCertificate(domainID uint64, domain string) error {
        payload, err := json.Marshal(SSLCertificatePayload{
                DomainID: domainID,
                Domain:   domain,
        })
        if err != nil {
                return fmt.Errorf("marshaling SSL certificate payload: %w", err)
        }

        task := asynq.NewTask(TaskTypeSSLCertificate, payload)
        info, err := c.client.Enqueue(task, asynq.Queue("default"), asynq.MaxRetry(5))
        if err != nil {
                return fmt.Errorf("enqueuing SSL certificate task: %w", err)
        }

        log.Printf("Enqueued SSL certificate task: domain=%s queue_id=%s", domain, info.ID)
        return nil
}

func (c *Client) EnqueueCronJob(jobID, appID uint64) error {
        payload, err := json.Marshal(CronJobPayload{
                JobID: jobID,
                AppID: appID,
        })
        if err != nil {
                return fmt.Errorf("marshaling cron job payload: %w", err)
        }

        task := asynq.NewTask(TaskTypeCronJob, payload)
        _, err = c.client.Enqueue(task, asynq.Queue("cron"), asynq.MaxRetry(1))
        if err != nil {
                return fmt.Errorf("enqueuing cron job task: %w", err)
        }
        return nil
}

func (c *Client) Close() error {
        return c.client.Close()
}

// Worker processes tasks from the asynq queue
type Worker struct {
        srv         *asynq.Server
        mux         *asynq.ServeMux
        pipeline    *deploy.Pipeline
        deployRepo  *repository.DeploymentRepo
        appRepo     *repository.AppRepo
        dbRepo      *repository.DatabaseRepo
        domainRepo  *repository.DomainRepo
        cronJobRepo *repository.CronJobRepo
        hub         *realtime.Hub
}

func NewWorker(
        redisAddr, redisPassword string, redisDB int,
        pipeline *deploy.Pipeline,
        deployRepo *repository.DeploymentRepo,
        appRepo *repository.AppRepo,
        dbRepo *repository.DatabaseRepo,
        domainRepo *repository.DomainRepo,
        cronJobRepo *repository.CronJobRepo,
        hub *realtime.Hub,
) *Worker {
        srv := asynq.NewServer(
                asynq.RedisClientOpt{
                        Addr:     redisAddr,
                        Password: redisPassword,
                        DB:       redisDB,
                },
                asynq.Config{
                        Concurrency: 2,
                        Queues: map[string]int{
                                "deploy": 10,
                                "cron":   5,
                                "default": 3,
                        },
                        RetryDelayFunc: func(n int, err error, task *asynq.Task) time.Duration {
                                return time.Duration(n) * 30 * time.Second
                        },
                },
        )

        w := &Worker{
                srv:         srv,
                pipeline:    pipeline,
                deployRepo:  deployRepo,
                appRepo:     appRepo,
                dbRepo:      dbRepo,
                domainRepo:  domainRepo,
                cronJobRepo: cronJobRepo,
                hub:         hub,
        }

        mux := asynq.NewServeMux()
        mux.HandleFunc(TaskTypeDeploy, w.handleDeploy)
        mux.HandleFunc(TaskTypeDBProvision, w.handleDBProvision)
        mux.HandleFunc(TaskTypeSSLCertificate, w.handleSSLCertificate)
        mux.HandleFunc(TaskTypeCronJob, w.handleCronJob)

        w.mux = mux

        return w
}

func (w *Worker) Start() error {
        log.Println("Starting asynq worker...")
        return w.srv.Run(w.mux)
}

func (w *Worker) handleDeploy(ctx context.Context, t *asynq.Task) error {
        var payload DeployPayload
        if err := json.Unmarshal(t.Payload(), &payload); err != nil {
                return fmt.Errorf("unmarshaling deploy payload: %w", err)
        }

        log.Printf("Processing deploy task: app=%d deployment=%d", payload.AppID, payload.DeploymentID)

        app, err := w.appRepo.FindByID(ctx, payload.AppID)
        if err != nil {
                return fmt.Errorf("finding app: %w", err)
        }

        deployment, err := w.deployRepo.FindByID(ctx, payload.DeploymentID)
        if err != nil {
                return fmt.Errorf("finding deployment: %w", err)
        }

        if err := w.pipeline.RunPipeline(ctx, app, deployment); err != nil {
                log.Printf("Deploy pipeline failed: app=%d deployment=%d error=%v", payload.AppID, payload.DeploymentID, err)
                return err
        }

        log.Printf("Deploy pipeline completed: app=%d deployment=%d", payload.AppID, payload.DeploymentID)
        return nil
}

func (w *Worker) handleDBProvision(ctx context.Context, t *asynq.Task) error {
        var payload DBProvisionPayload
        if err := json.Unmarshal(t.Payload(), &payload); err != nil {
                return fmt.Errorf("unmarshaling db provision payload: %w", err)
        }

        log.Printf("Processing DB provision task: app=%d db=%d type=%s", payload.AppID, payload.DatabaseID, payload.DBType)

        // In production, this would:
        // 1. Create a Docker container for the database
        // 2. Wait for it to be ready
        // 3. Update the connection string in the database record
        // For now, we just log it

        return nil
}

func (w *Worker) handleSSLCertificate(ctx context.Context, t *asynq.Task) error {
        var payload SSLCertificatePayload
        if err := json.Unmarshal(t.Payload(), &payload); err != nil {
                return fmt.Errorf("unmarshaling SSL certificate payload: %w", err)
        }

        log.Printf("Processing SSL certificate task: domain=%s", payload.Domain)

        // In production, this would:
        // 1. Use Let's Encrypt / ACME to obtain a certificate
        // 2. Configure Traefik with the certificate
        // 3. Update the domain record with cert expiry

        return nil
}

func (w *Worker) handleCronJob(ctx context.Context, t *asynq.Task) error {
        var payload CronJobPayload
        if err := json.Unmarshal(t.Payload(), &payload); err != nil {
                return fmt.Errorf("unmarshaling cron job payload: %w", err)
        }

        log.Printf("Processing cron job task: job=%d app=%d", payload.JobID, payload.AppID)

        // In production, this would:
        // 1. Find the app's container
        // 2. Execute the command in the container
        // 3. Update the last_run timestamp

        // Update last run time
        job, err := w.cronJobRepo.FindByID(ctx, payload.JobID)
        if err != nil {
                return fmt.Errorf("finding cron job: %w", err)
        }

        now := time.Now()
        job.LastRun = &now
        if err := w.cronJobRepo.Update(ctx, job); err != nil {
                return fmt.Errorf("updating cron job: %w", err)
        }

        return nil
}
