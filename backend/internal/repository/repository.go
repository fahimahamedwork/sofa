package repository

import (
	"context"
	"time"

	"github.com/sofa/sofa-backend/internal/model"
	"gorm.io/gorm"
)

// AppRepo handles database operations for apps
type AppRepo struct {
	db *gorm.DB
}

func NewAppRepo(db *gorm.DB) *AppRepo {
	return &AppRepo{db: db}
}

func (r *AppRepo) Create(ctx context.Context, app *model.App) error {
	return r.db.WithContext(ctx).Create(app).Error
}

func (r *AppRepo) FindByID(ctx context.Context, id uint64) (*model.App, error) {
	var app model.App
	if err := r.db.WithContext(ctx).First(&app, id).Error; err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *AppRepo) FindBySlug(ctx context.Context, slug string) (*model.App, error) {
	var app model.App
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&app).Error; err != nil {
		return nil, err
	}
	return &app, nil
}

func (r *AppRepo) FindAll(ctx context.Context, offset, limit int) ([]model.App, int64, error) {
	var apps []model.App
	var total int64

	if err := r.db.WithContext(ctx).Model(&model.App{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.WithContext(ctx).Offset(offset).Limit(limit).Order("created_at DESC").Find(&apps).Error; err != nil {
		return nil, 0, err
	}
	return apps, total, nil
}

func (r *AppRepo) FindByStatus(ctx context.Context, status model.AppStatus) ([]model.App, error) {
	var apps []model.App
	if err := r.db.WithContext(ctx).Where("status = ?", status).Find(&apps).Error; err != nil {
		return nil, err
	}
	return apps, nil
}

func (r *AppRepo) Update(ctx context.Context, app *model.App) error {
	return r.db.WithContext(ctx).Save(app).Error
}

func (r *AppRepo) UpdateStatus(ctx context.Context, id uint64, status model.AppStatus) error {
	return r.db.WithContext(ctx).Model(&model.App{}).Where("id = ?", id).Update("status", status).Error
}

func (r *AppRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.App{}, id).Error
}

// DeploymentRepo handles database operations for deployments
type DeploymentRepo struct {
	db *gorm.DB
}

func NewDeploymentRepo(db *gorm.DB) *DeploymentRepo {
	return &DeploymentRepo{db: db}
}

func (r *DeploymentRepo) Create(ctx context.Context, deployment *model.Deployment) error {
	return r.db.WithContext(ctx).Create(deployment).Error
}

func (r *DeploymentRepo) FindByID(ctx context.Context, id uint64) (*model.Deployment, error) {
	var deployment model.Deployment
	if err := r.db.WithContext(ctx).First(&deployment, id).Error; err != nil {
		return nil, err
	}
	return &deployment, nil
}

func (r *DeploymentRepo) FindByAppID(ctx context.Context, appID uint64, offset, limit int) ([]model.Deployment, int64, error) {
	var deployments []model.Deployment
	var total int64

	db := r.db.WithContext(ctx).Where("app_id = ?", appID)
	if err := db.Model(&model.Deployment{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&deployments).Error; err != nil {
		return nil, 0, err
	}
	return deployments, total, nil
}

func (r *DeploymentRepo) FindLatestByApp(ctx context.Context, appID uint64) (*model.Deployment, error) {
	var deployment model.Deployment
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Order("created_at DESC").First(&deployment).Error; err != nil {
		return nil, err
	}
	return &deployment, nil
}

func (r *DeploymentRepo) UpdateStatus(ctx context.Context, id uint64, status model.DeployStatus) error {
	updates := map[string]interface{}{"status": status}
	if status == model.DeployStatusBuilding || status == model.DeployStatusDeploying {
		now := time.Now()
		if status == model.DeployStatusBuilding {
			updates["started_at"] = &now
		}
	}
	if status == model.DeployStatusHealthy || status == model.DeployStatusFailed || status == model.DeployStatusCancelled {
		now := time.Now()
		updates["finished_at"] = &now
	}
	return r.db.WithContext(ctx).Model(&model.Deployment{}).Where("id = ?", id).Updates(updates).Error
}

func (r *DeploymentRepo) UpdateBuildLog(ctx context.Context, id uint64, log string) error {
	return r.db.WithContext(ctx).Model(&model.Deployment{}).Where("id = ?", id).Update("build_log", log).Error
}

func (r *DeploymentRepo) UpdateImageID(ctx context.Context, id uint64, imageID string) error {
	return r.db.WithContext(ctx).Model(&model.Deployment{}).Where("id = ?", id).Update("image_id", imageID).Error
}

func (r *DeploymentRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Deployment{}, id).Error
}

// EnvVarRepo handles database operations for env vars
type EnvVarRepo struct {
	db *gorm.DB
}

func NewEnvVarRepo(db *gorm.DB) *EnvVarRepo {
	return &EnvVarRepo{db: db}
}

func (r *EnvVarRepo) Create(ctx context.Context, envVar *model.EnvVar) error {
	return r.db.WithContext(ctx).Create(envVar).Error
}

func (r *EnvVarRepo) FindByAppID(ctx context.Context, appID uint64) ([]model.EnvVar, error) {
	var envVars []model.EnvVar
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Find(&envVars).Error; err != nil {
		return nil, err
	}
	return envVars, nil
}

func (r *EnvVarRepo) FindByID(ctx context.Context, id uint64) (*model.EnvVar, error) {
	var envVar model.EnvVar
	if err := r.db.WithContext(ctx).First(&envVar, id).Error; err != nil {
		return nil, err
	}
	return &envVar, nil
}

func (r *EnvVarRepo) FindByAppIDAndKey(ctx context.Context, appID uint64, key string) (*model.EnvVar, error) {
	var envVar model.EnvVar
	if err := r.db.WithContext(ctx).Where("app_id = ? AND key = ?", appID, key).First(&envVar).Error; err != nil {
		return nil, err
	}
	return &envVar, nil
}

func (r *EnvVarRepo) Upsert(ctx context.Context, envVar *model.EnvVar) error {
	var existing model.EnvVar
	err := r.db.WithContext(ctx).Where("app_id = ? AND key = ?", envVar.AppID, envVar.Key).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return r.db.WithContext(ctx).Create(envVar).Error
		}
		return err
	}
	existing.EncryptedValue = envVar.EncryptedValue
	return r.db.WithContext(ctx).Save(&existing).Error
}

func (r *EnvVarRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.EnvVar{}, id).Error
}

// DomainRepo handles database operations for domains
type DomainRepo struct {
	db *gorm.DB
}

func NewDomainRepo(db *gorm.DB) *DomainRepo {
	return &DomainRepo{db: db}
}

func (r *DomainRepo) Create(ctx context.Context, domain *model.Domain) error {
	return r.db.WithContext(ctx).Create(domain).Error
}

func (r *DomainRepo) FindByAppID(ctx context.Context, appID uint64) ([]model.Domain, error) {
	var domains []model.Domain
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Find(&domains).Error; err != nil {
		return nil, err
	}
	return domains, nil
}

func (r *DomainRepo) FindByDomain(ctx context.Context, domain string) (*model.Domain, error) {
	var d model.Domain
	if err := r.db.WithContext(ctx).Where("domain = ?", domain).First(&d).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DomainRepo) FindByID(ctx context.Context, id uint64) (*model.Domain, error) {
	var d model.Domain
	if err := r.db.WithContext(ctx).First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DomainRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Domain{}, id).Error
}

// VolumeRepo handles database operations for volumes
type VolumeRepo struct {
	db *gorm.DB
}

func NewVolumeRepo(db *gorm.DB) *VolumeRepo {
	return &VolumeRepo{db: db}
}

func (r *VolumeRepo) Create(ctx context.Context, volume *model.Volume) error {
	return r.db.WithContext(ctx).Create(volume).Error
}

func (r *VolumeRepo) FindByAppID(ctx context.Context, appID uint64) ([]model.Volume, error) {
	var volumes []model.Volume
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Find(&volumes).Error; err != nil {
		return nil, err
	}
	return volumes, nil
}

func (r *VolumeRepo) FindByID(ctx context.Context, id uint64) (*model.Volume, error) {
	var v model.Volume
	if err := r.db.WithContext(ctx).First(&v, id).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VolumeRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Volume{}, id).Error
}

// DatabaseRepo handles database operations for database resources
type DatabaseRepo struct {
	db *gorm.DB
}

func NewDatabaseRepo(db *gorm.DB) *DatabaseRepo {
	return &DatabaseRepo{db: db}
}

func (r *DatabaseRepo) Create(ctx context.Context, database *model.Database) error {
	return r.db.WithContext(ctx).Create(database).Error
}

func (r *DatabaseRepo) FindByAppID(ctx context.Context, appID uint64) ([]model.Database, error) {
	var databases []model.Database
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Find(&databases).Error; err != nil {
		return nil, err
	}
	return databases, nil
}

func (r *DatabaseRepo) FindByID(ctx context.Context, id uint64) (*model.Database, error) {
	var d model.Database
	if err := r.db.WithContext(ctx).First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DatabaseRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.Database{}, id).Error
}

// CronJobRepo handles database operations for cron jobs
type CronJobRepo struct {
	db *gorm.DB
}

func NewCronJobRepo(db *gorm.DB) *CronJobRepo {
	return &CronJobRepo{db: db}
}

func (r *CronJobRepo) Create(ctx context.Context, job *model.CronJob) error {
	return r.db.WithContext(ctx).Create(job).Error
}

func (r *CronJobRepo) FindByAppID(ctx context.Context, appID uint64) ([]model.CronJob, error) {
	var jobs []model.CronJob
	if err := r.db.WithContext(ctx).Where("app_id = ?", appID).Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *CronJobRepo) FindByID(ctx context.Context, id uint64) (*model.CronJob, error) {
	var j model.CronJob
	if err := r.db.WithContext(ctx).First(&j, id).Error; err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *CronJobRepo) FindEnabled(ctx context.Context) ([]model.CronJob, error) {
	var jobs []model.CronJob
	if err := r.db.WithContext(ctx).Where("enabled = ?", true).Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *CronJobRepo) Update(ctx context.Context, job *model.CronJob) error {
	return r.db.WithContext(ctx).Save(job).Error
}

func (r *CronJobRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.CronJob{}, id).Error
}

// SettingRepo handles database operations for settings
type SettingRepo struct {
	db *gorm.DB
}

func NewSettingRepo(db *gorm.DB) *SettingRepo {
	return &SettingRepo{db: db}
}

func (r *SettingRepo) Get(ctx context.Context, key string) (*model.Setting, error) {
	var s model.Setting
	if err := r.db.WithContext(ctx).Where("key = ?", key).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *SettingRepo) Set(ctx context.Context, key, value string) error {
	var s model.Setting
	err := r.db.WithContext(ctx).Where("key = ?", key).First(&s).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			s = model.Setting{Key: key, Value: value}
			return r.db.WithContext(ctx).Create(&s).Error
		}
		return err
	}
	s.Value = value
	return r.db.WithContext(ctx).Save(&s).Error
}

func (r *SettingRepo) FindAll(ctx context.Context) ([]model.Setting, error) {
	var settings []model.Setting
	if err := r.db.WithContext(ctx).Find(&settings).Error; err != nil {
		return nil, err
	}
	return settings, nil
}

// SSHKeyRepo handles database operations for SSH keys
type SSHKeyRepo struct {
	db *gorm.DB
}

func NewSSHKeyRepo(db *gorm.DB) *SSHKeyRepo {
	return &SSHKeyRepo{db: db}
}

func (r *SSHKeyRepo) Create(ctx context.Context, key *model.SSHKey) error {
	return r.db.WithContext(ctx).Create(key).Error
}

func (r *SSHKeyRepo) FindByID(ctx context.Context, id uint64) (*model.SSHKey, error) {
	var k model.SSHKey
	if err := r.db.WithContext(ctx).First(&k, id).Error; err != nil {
		return nil, err
	}
	return &k, nil
}

func (r *SSHKeyRepo) FindAll(ctx context.Context) ([]model.SSHKey, error) {
	var keys []model.SSHKey
	if err := r.db.WithContext(ctx).Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

func (r *SSHKeyRepo) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Delete(&model.SSHKey{}, id).Error
}
