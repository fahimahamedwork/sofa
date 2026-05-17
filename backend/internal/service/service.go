package service

import (
        "context"
        "fmt"
        "log"
        "regexp"
        "strings"
        "time"

        "github.com/sofa/sofa-backend/internal/crypto"
        "github.com/sofa/sofa-backend/internal/deploy"
        "github.com/sofa/sofa-backend/internal/model"
        "github.com/sofa/sofa-backend/internal/queue"
        "github.com/sofa/sofa-backend/internal/realtime"
        "github.com/sofa/sofa-backend/internal/repository"
)

// AppService handles app business logic
type AppService struct {
        appRepo       *repository.AppRepo
        deployRepo    *repository.DeploymentRepo
        envVarRepo    *repository.EnvVarRepo
        domainRepo    *repository.DomainRepo
        volumeRepo    *repository.VolumeRepo
        databaseRepo  *repository.DatabaseRepo
        cronJobRepo   *repository.CronJobRepo
}

func NewAppService(
        appRepo *repository.AppRepo,
        deployRepo *repository.DeploymentRepo,
        envVarRepo *repository.EnvVarRepo,
        domainRepo *repository.DomainRepo,
        volumeRepo *repository.VolumeRepo,
        databaseRepo *repository.DatabaseRepo,
        cronJobRepo *repository.CronJobRepo,
) *AppService {
        return &AppService{
                appRepo:      appRepo,
                deployRepo:   deployRepo,
                envVarRepo:   envVarRepo,
                domainRepo:   domainRepo,
                volumeRepo:   volumeRepo,
                databaseRepo: databaseRepo,
                cronJobRepo:  cronJobRepo,
        }
}

func (s *AppService) CreateApp(ctx context.Context, name, sourceType, sourceURL, branch, framework, buildCmd string, port int, cpuLimit float64, memoryLimit int) (*model.App, error) {
        slug := generateSlug(name)

        // Check slug uniqueness
        existing, _ := s.appRepo.FindBySlug(ctx, slug)
        if existing != nil {
                slug = slug + "-" + fmt.Sprintf("%d", time.Now().UnixNano()%10000)
        }

        if branch == "" {
                branch = "main"
        }
        if port == 0 {
                port = 3000
        }
        if cpuLimit == 0 {
                cpuLimit = 0.5
        }
        if memoryLimit == 0 {
                memoryLimit = 512
        }

        app := &model.App{
                Name:        name,
                Slug:        slug,
                SourceType:  model.SourceType(sourceType),
                SourceURL:   sourceURL,
                Branch:      branch,
                Framework:   framework,
                BuildCmd:    buildCmd,
                Port:        port,
                Status:      model.AppStatusStopped,
                CPULimit:    cpuLimit,
                MemoryLimit: memoryLimit,
        }

        if err := s.appRepo.Create(ctx, app); err != nil {
                return nil, fmt.Errorf("creating app: %w", err)
        }

        return app, nil
}

func (s *AppService) GetApp(ctx context.Context, id uint64) (*model.App, error) {
        app, err := s.appRepo.FindByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("finding app: %w", err)
        }
        return app, nil
}

func (s *AppService) GetAppBySlug(ctx context.Context, slug string) (*model.App, error) {
        app, err := s.appRepo.FindBySlug(ctx, slug)
        if err != nil {
                return nil, fmt.Errorf("finding app by slug: %w", err)
        }
        return app, nil
}

func (s *AppService) ListApps(ctx context.Context, page, pageSize int) ([]model.App, int64, error) {
        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }
        offset := (page - 1) * pageSize
        return s.appRepo.FindAll(ctx, offset, pageSize)
}

func (s *AppService) UpdateApp(ctx context.Context, id uint64, updates map[string]interface{}) (*model.App, error) {
        app, err := s.appRepo.FindByID(ctx, id)
        if err != nil {
                return nil, fmt.Errorf("finding app: %w", err)
        }

        if name, ok := updates["name"].(string); ok && name != "" {
                app.Name = name
        }
        if sourceURL, ok := updates["source_url"].(string); ok {
                app.SourceURL = sourceURL
        }
        if branch, ok := updates["branch"].(string); ok {
                app.Branch = branch
        }
        if framework, ok := updates["framework"].(string); ok {
                app.Framework = framework
        }
        if buildCmd, ok := updates["build_cmd"].(string); ok {
                app.BuildCmd = buildCmd
        }
        if port, ok := updates["port"].(float64); ok {
                app.Port = int(port)
        }
        if cpuLimit, ok := updates["cpu_limit"].(float64); ok {
                app.CPULimit = cpuLimit
        }
        if memoryLimit, ok := updates["memory_limit"].(float64); ok {
                app.MemoryLimit = int(memoryLimit)
        }

        if err := s.appRepo.Update(ctx, app); err != nil {
                return nil, fmt.Errorf("updating app: %w", err)
        }
        return app, nil
}

func (s *AppService) DeleteApp(ctx context.Context, id uint64) error {
        // Clean up associated resources
        envVars, _ := s.envVarRepo.FindByAppID(ctx, id)
        for _, ev := range envVars {
                _ = s.envVarRepo.Delete(ctx, ev.ID)
        }

        domains, _ := s.domainRepo.FindByAppID(ctx, id)
        for _, d := range domains {
                _ = s.domainRepo.Delete(ctx, d.ID)
        }

        volumes, _ := s.volumeRepo.FindByAppID(ctx, id)
        for _, v := range volumes {
                _ = s.volumeRepo.Delete(ctx, v.ID)
        }

        databases, _ := s.databaseRepo.FindByAppID(ctx, id)
        for _, d := range databases {
                _ = s.databaseRepo.Delete(ctx, d.ID)
        }

        cronJobs, _ := s.cronJobRepo.FindByAppID(ctx, id)
        for _, j := range cronJobs {
                _ = s.cronJobRepo.Delete(ctx, j.ID)
        }

        return s.appRepo.Delete(ctx, id)
}

func (s *AppService) StartApp(ctx context.Context, id uint64) error {
        return s.appRepo.UpdateStatus(ctx, id, model.AppStatusRunning)
}

func (s *AppService) StopApp(ctx context.Context, id uint64) error {
        return s.appRepo.UpdateStatus(ctx, id, model.AppStatusStopped)
}

func (s *AppService) RestartApp(ctx context.Context, id uint64) error {
        // For restart, we set to building briefly then running
        if err := s.appRepo.UpdateStatus(ctx, id, model.AppStatusBuilding); err != nil {
                return err
        }
        return s.appRepo.UpdateStatus(ctx, id, model.AppStatusRunning)
}

// DeployService handles deployment business logic
type DeployService struct {
        deployRepo   *repository.DeploymentRepo
        appRepo      *repository.AppRepo
        pipeline     *deploy.Pipeline
        queueClient  *queue.Client
        hub          *realtime.Hub
}

func NewDeployService(
        deployRepo *repository.DeploymentRepo,
        appRepo *repository.AppRepo,
        pipeline *deploy.Pipeline,
        queueClient *queue.Client,
        hub *realtime.Hub,
) *DeployService {
        return &DeployService{
                deployRepo:  deployRepo,
                appRepo:     appRepo,
                pipeline:    pipeline,
                queueClient: queueClient,
                hub:         hub,
        }
}

func (s *DeployService) CreateDeployment(ctx context.Context, appID uint64, sourceURL, branch, commitHash string, config model.JSONMap) (*model.Deployment, error) {
        app, err := s.appRepo.FindByID(ctx, appID)
        if err != nil {
                return nil, fmt.Errorf("finding app: %w", err)
        }

        if sourceURL == "" {
                sourceURL = app.SourceURL
        }
        if branch == "" {
                branch = app.Branch
        }

        deployment := &model.Deployment{
                AppID:      appID,
                Status:     model.DeployStatusQueued,
                SourceURL:  sourceURL,
                Branch:     branch,
                CommitHash: commitHash,
                Config:     config,
        }

        if err := s.deployRepo.Create(ctx, deployment); err != nil {
                return nil, fmt.Errorf("creating deployment: %w", err)
        }

        // Update app status to building
        _ = s.appRepo.UpdateStatus(ctx, appID, model.AppStatusBuilding)

        // Trigger the deployment pipeline
        s.triggerDeployment(app, deployment)

        return deployment, nil
}

// triggerDeployment starts the deployment either via queue or directly via pipeline
func (s *DeployService) triggerDeployment(app *model.App, deployment *model.Deployment) {
        // Try to enqueue via Redis/asynq first
        if s.queueClient != nil {
                if err := s.queueClient.EnqueueDeploy(app.ID, deployment.ID); err != nil {
                        log.Printf("Failed to enqueue deploy task, running directly: %v", err)
                        // Fall back to running pipeline directly
                        go s.runPipelineDirectly(app, deployment)
                }
        } else {
                // No queue available, run pipeline directly in a goroutine
                go s.runPipelineDirectly(app, deployment)
        }
}

func (s *DeployService) runPipelineDirectly(app *model.App, deployment *model.Deployment) {
        if s.pipeline == nil {
                log.Printf("Pipeline is nil, cannot deploy app=%d deployment=%d", app.ID, deployment.ID)
                // Mark as failed
                ctx := context.Background()
                _ = s.deployRepo.UpdateStatus(ctx, deployment.ID, model.DeployStatusFailed)
                _ = s.deployRepo.UpdateBuildLog(ctx, deployment.ID, "Docker daemon is not available - deploy functionality is disabled")
                _ = s.appRepo.UpdateStatus(ctx, app.ID, model.AppStatusError)
                return
        }

        ctx := context.Background()
        if err := s.pipeline.RunPipeline(ctx, app, deployment); err != nil {
                log.Printf("Deploy pipeline failed: app=%d deployment=%d error=%v", app.ID, deployment.ID, err)
        }
}

func (s *DeployService) GetDeployments(ctx context.Context, appID uint64, page, pageSize int) ([]model.Deployment, int64, error) {
        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }
        offset := (page - 1) * pageSize
        return s.deployRepo.FindByAppID(ctx, appID, offset, pageSize)
}

func (s *DeployService) GetDeployment(ctx context.Context, id uint64) (*model.Deployment, error) {
        return s.deployRepo.FindByID(ctx, id)
}

func (s *DeployService) GetLatestDeployment(ctx context.Context, appID uint64) (*model.Deployment, error) {
        return s.deployRepo.FindLatestByApp(ctx, appID)
}

func (s *DeployService) UpdateDeploymentStatus(ctx context.Context, id uint64, status model.DeployStatus) error {
        return s.deployRepo.UpdateStatus(ctx, id, status)
}

func (s *DeployService) UpdateBuildLog(ctx context.Context, id uint64, log string) error {
        return s.deployRepo.UpdateBuildLog(ctx, id, log)
}

func (s *DeployService) Rollback(ctx context.Context, appID uint64, deploymentID uint64) (*model.Deployment, error) {
        // Find the deployment to rollback to
        target, err := s.deployRepo.FindByID(ctx, deploymentID)
        if err != nil {
                return nil, fmt.Errorf("finding target deployment: %w", err)
        }

        if target.AppID != appID {
                return nil, fmt.Errorf("deployment does not belong to this app")
        }

        if target.Status != model.DeployStatusHealthy {
                return nil, fmt.Errorf("can only rollback to a healthy deployment")
        }

        // Create a new deployment based on the target
        rollback := &model.Deployment{
                AppID:      appID,
                Status:     model.DeployStatusQueued,
                SourceURL:  target.SourceURL,
                Branch:     target.Branch,
                CommitHash: target.CommitHash,
                ImageID:    target.ImageID,
                Config:     target.Config,
        }

        if err := s.deployRepo.Create(ctx, rollback); err != nil {
                return nil, fmt.Errorf("creating rollback deployment: %w", err)
        }

        return rollback, nil
}

// EnvVarService handles environment variable business logic
type EnvVarService struct {
        envVarRepo *repository.EnvVarRepo
        encryptor  *crypto.Encryptor
}

func NewEnvVarService(envVarRepo *repository.EnvVarRepo, encryptor *crypto.Encryptor) *EnvVarService {
        return &EnvVarService{
                envVarRepo: envVarRepo,
                encryptor:  encryptor,
        }
}

func (s *EnvVarService) ListEnvVars(ctx context.Context, appID uint64) ([]model.EnvVar, error) {
        vars, err := s.envVarRepo.FindByAppID(ctx, appID)
        if err != nil {
                return nil, fmt.Errorf("listing env vars: %w", err)
        }
        return vars, nil
}

func (s *EnvVarService) SetEnvVar(ctx context.Context, appID uint64, key, value string) (*model.EnvVar, error) {
        encryptedValue, err := s.encryptor.Encrypt(value)
        if err != nil {
                return nil, fmt.Errorf("encrypting value: %w", err)
        }

        envVar := &model.EnvVar{
                AppID:          appID,
                Key:            key,
                EncryptedValue: encryptedValue,
        }

        if err := s.envVarRepo.Upsert(ctx, envVar); err != nil {
                return nil, fmt.Errorf("upserting env var: %w", err)
        }

        return envVar, nil
}

func (s *EnvVarService) DeleteEnvVar(ctx context.Context, id uint64) error {
        return s.envVarRepo.Delete(ctx, id)
}

func (s *EnvVarService) DecryptValue(encrypted string) (string, error) {
        return s.encryptor.Decrypt(encrypted)
}

// DomainService handles domain business logic
type DomainService struct {
        domainRepo  *repository.DomainRepo
        appRepo     *repository.AppRepo
        baseDomain  string
}

func NewDomainService(domainRepo *repository.DomainRepo, appRepo *repository.AppRepo, baseDomain string) *DomainService {
        return &DomainService{
                domainRepo: domainRepo,
                appRepo:    appRepo,
                baseDomain: baseDomain,
        }
}

func (s *DomainService) ListDomains(ctx context.Context, appID uint64) ([]model.Domain, error) {
        return s.domainRepo.FindByAppID(ctx, appID)
}

func (s *DomainService) ListAllDomains(ctx context.Context) ([]model.Domain, error) {
        return s.domainRepo.FindAll(ctx)
}

func (s *DomainService) VerifyDomain(ctx context.Context, id uint64) error {
        // Placeholder - in production this would trigger DNS verification
        return nil
}

func (s *DomainService) SetPrimary(ctx context.Context, id uint64) error {
        // Placeholder - in production this would update the primary domain
        return nil
}

func (s *DomainService) AddDomain(ctx context.Context, appID uint64, domainName string, domainType string, sslEnabled bool) (*model.Domain, error) {
        // Check if domain already exists
        existing, _ := s.domainRepo.FindByDomain(ctx, domainName)
        if existing != nil {
                return nil, fmt.Errorf("domain already exists")
        }

        domain := &model.Domain{
                AppID:      appID,
                Domain:     domainName,
                Type:       model.DomainType(domainType),
                SSLEnabled: sslEnabled,
        }

        if err := s.domainRepo.Create(ctx, domain); err != nil {
                return nil, fmt.Errorf("creating domain: %w", err)
        }

        return domain, nil
}

func (s *DomainService) RemoveDomain(ctx context.Context, id uint64) error {
        return s.domainRepo.Delete(ctx, id)
}

func (s *DomainService) CheckDNS(ctx context.Context, domainName string) (bool, string, error) {
        // In production, this would do actual DNS resolution
        // For now, we do a basic check
        if strings.Contains(domainName, s.baseDomain) {
                return true, "Subdomain resolves correctly", nil
        }
        return false, "DNS record not found - please configure your DNS to point to this server", nil
}

func (s *DomainService) GenerateSubdomain(appSlug string) string {
        return fmt.Sprintf("%s.%s", appSlug, s.baseDomain)
}

// DatabaseService handles database provisioning
type DatabaseService struct {
        databaseRepo *repository.DatabaseRepo
        encryptor    *crypto.Encryptor
}

func NewDatabaseService(databaseRepo *repository.DatabaseRepo, encryptor *crypto.Encryptor) *DatabaseService {
        return &DatabaseService{
                databaseRepo: databaseRepo,
                encryptor:    encryptor,
        }
}

func (s *DatabaseService) ListDatabases(ctx context.Context, appID uint64) ([]model.Database, error) {
        return s.databaseRepo.FindByAppID(ctx, appID)
}

func (s *DatabaseService) ListAllDatabases(ctx context.Context) ([]model.Database, error) {
        return s.databaseRepo.FindAll(ctx)
}

func (s *DatabaseService) ProvisionDB(ctx context.Context, appID uint64, dbType model.DatabaseType, connectionString string) (*model.Database, error) {
        encryptedCS, err := s.encryptor.Encrypt(connectionString)
        if err != nil {
                return nil, fmt.Errorf("encrypting connection string: %w", err)
        }

        database := &model.Database{
                AppID:                     appID,
                Type:                      dbType,
                ConnectionStringEncrypted: encryptedCS,
        }

        if err := s.databaseRepo.Create(ctx, database); err != nil {
                return nil, fmt.Errorf("creating database: %w", err)
        }

        return database, nil
}

func (s *DatabaseService) RemoveDB(ctx context.Context, id uint64) error {
        return s.databaseRepo.Delete(ctx, id)
}

func (s *DatabaseService) GetConnectionString(ctx context.Context, id uint64) (string, error) {
        db, err := s.databaseRepo.FindByID(ctx, id)
        if err != nil {
                return "", fmt.Errorf("finding database: %w", err)
        }
        return s.encryptor.Decrypt(db.ConnectionStringEncrypted)
}

// SettingService handles settings business logic
type SettingService struct {
        settingRepo *repository.SettingRepo
}

func NewSettingService(settingRepo *repository.SettingRepo) *SettingService {
        return &SettingService{settingRepo: settingRepo}
}

func (s *SettingService) Get(ctx context.Context, key string) (string, error) {
        setting, err := s.settingRepo.Get(ctx, key)
        if err != nil {
                return "", err
        }
        return setting.Value, nil
}

func (s *SettingService) Set(ctx context.Context, key, value string) error {
        return s.settingRepo.Set(ctx, key, value)
}

func (s *SettingService) GetAll(ctx context.Context) (map[string]string, error) {
        settings, err := s.settingRepo.FindAll(ctx)
        if err != nil {
                return nil, err
        }

        result := make(map[string]string)
        for _, s := range settings {
                result[s.Key] = s.Value
        }
        return result, nil
}

// VolumeService handles volume business logic
type VolumeService struct {
        volumeRepo *repository.VolumeRepo
}

func NewVolumeService(volumeRepo *repository.VolumeRepo) *VolumeService {
        return &VolumeService{volumeRepo: volumeRepo}
}

func (s *VolumeService) ListVolumes(ctx context.Context, appID uint64) ([]model.Volume, error) {
        return s.volumeRepo.FindByAppID(ctx, appID)
}

func (s *VolumeService) AttachVolume(ctx context.Context, appID uint64, name, mountPath, size string) (*model.Volume, error) {
        if size == "" {
                size = "1G"
        }
        volume := &model.Volume{
                AppID:     appID,
                Name:      name,
                MountPath: mountPath,
                Size:      size,
        }
        if err := s.volumeRepo.Create(ctx, volume); err != nil {
                return nil, fmt.Errorf("creating volume: %w", err)
        }
        return volume, nil
}

func (s *VolumeService) DetachVolume(ctx context.Context, id uint64) error {
        return s.volumeRepo.Delete(ctx, id)
}

// SSHKeyService handles SSH key business logic
type SSHKeyService struct {
        sshKeyRepo *repository.SSHKeyRepo
}

func NewSSHKeyService(sshKeyRepo *repository.SSHKeyRepo) *SSHKeyService {
        return &SSHKeyService{sshKeyRepo: sshKeyRepo}
}

func (s *SSHKeyService) ListSSHKeys(ctx context.Context) ([]model.SSHKey, error) {
        return s.sshKeyRepo.FindAll(ctx)
}

func (s *SSHKeyService) AddSSHKey(ctx context.Context, name, publicKey, fingerprint string) (*model.SSHKey, error) {
        key := &model.SSHKey{
                Name:        name,
                PublicKey:   publicKey,
                Fingerprint: fingerprint,
        }
        if err := s.sshKeyRepo.Create(ctx, key); err != nil {
                return nil, fmt.Errorf("creating SSH key: %w", err)
        }
        return key, nil
}

func (s *SSHKeyService) RemoveSSHKey(ctx context.Context, id uint64) error {
        return s.sshKeyRepo.Delete(ctx, id)
}

// Helper function to generate a slug from app name
func generateSlug(name string) string {
        slug := strings.ToLower(name)
        slug = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(slug, "-")
        slug = regexp.MustCompile(`^-+|-+$`).ReplaceAllString(slug, "")
        if len(slug) > 63 {
                slug = slug[:63]
        }
        return slug
}
