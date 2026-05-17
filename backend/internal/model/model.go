package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// SourceType enum
type SourceType string

const (
	SourceTypeGit          SourceType = "git"
	SourceTypeDockerImage  SourceType = "docker_image"
	SourceTypeDockerfile   SourceType = "dockerfile"
)

// AppStatus enum
type AppStatus string

const (
	AppStatusRunning  AppStatus = "running"
	AppStatusStopped  AppStatus = "stopped"
	AppStatusBuilding AppStatus = "building"
	AppStatusError    AppStatus = "error"
)

// DeployStatus enum
type DeployStatus string

const (
	DeployStatusQueued    DeployStatus = "queued"
	DeployStatusBuilding  DeployStatus = "building"
	DeployStatusDeploying DeployStatus = "deploying"
	DeployStatusHealthy   DeployStatus = "healthy"
	DeployStatusFailed    DeployStatus = "failed"
	DeployStatusCancelled DeployStatus = "cancelled"
)

// DomainType enum
type DomainType string

const (
	DomainTypeSubdomain DomainType = "subdomain"
	DomainTypeCustom    DomainType = "custom"
)

// DatabaseType enum
type DatabaseType string

const (
	DatabaseTypePostgres DatabaseType = "postgres"
	DatabaseTypeMySQL    DatabaseType = "mysql"
	DatabaseTypeRedis    DatabaseType = "redis"
	DatabaseTypeMongoDB  DatabaseType = "mongodb"
)

// JSONMap is a helper type for storing JSON data
type JSONMap map[string]interface{}

func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

type App struct {
	ID           uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string     `gorm:"size:255;not null" json:"name"`
	Slug         string     `gorm:"size:255;uniqueIndex;not null" json:"slug"`
	SourceType   SourceType `gorm:"size:50;not null;default:'git'" json:"source_type"`
	SourceURL    string     `gorm:"size:1024" json:"source_url"`
	Branch       string     `gorm:"size:255;default:'main'" json:"branch"`
	Framework    string     `gorm:"size:100" json:"framework"`
	BuildCmd     string     `gorm:"size:1024" json:"build_cmd"`
	Port         int        `gorm:"default:3000" json:"port"`
	Status       AppStatus  `gorm:"size:50;not null;default:'stopped'" json:"status"`
	ContainerID  string     `gorm:"size:255" json:"container_id"`
	ImageID      string     `gorm:"size:255" json:"image_id"`
	CPULimit     float64    `gorm:"default:0.5" json:"cpu_limit"`
	MemoryLimit  int        `gorm:"default:512" json:"memory_limit"` // in MB
	CreatedAt    time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	Deployments []Deployment `gorm:"foreignKey:AppID" json:"deployments,omitempty"`
	EnvVars     []EnvVar     `gorm:"foreignKey:AppID" json:"env_vars,omitempty"`
	Domains     []Domain     `gorm:"foreignKey:AppID" json:"domains,omitempty"`
	Volumes     []Volume     `gorm:"foreignKey:AppID" json:"volumes,omitempty"`
	Databases   []Database   `gorm:"foreignKey:AppID" json:"databases,omitempty"`
	CronJobs    []CronJob    `gorm:"foreignKey:AppID" json:"cron_jobs,omitempty"`
}

func (App) TableName() string { return "apps" }

type Deployment struct {
	ID         uint64       `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID      uint64       `gorm:"not null;index" json:"app_id"`
	Status     DeployStatus `gorm:"size:50;not null;default:'queued'" json:"status"`
	SourceURL  string       `gorm:"size:1024" json:"source_url"`
	Branch     string       `gorm:"size:255" json:"branch"`
	CommitHash string       `gorm:"size:255" json:"commit_hash"`
	ImageID    string       `gorm:"size:255" json:"image_id"`
	BuildLog   string       `gorm:"type:text" json:"build_log"`
	Config     JSONMap      `gorm:"type:json" json:"config"`
	StartedAt  *time.Time   `json:"started_at"`
	FinishedAt *time.Time   `json:"finished_at"`
	CreatedAt  time.Time    `gorm:"autoCreateTime" json:"created_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (Deployment) TableName() string { return "deployments" }

type EnvVar struct {
	ID             uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID          uint64    `gorm:"not null;index" json:"app_id"`
	Key            string    `gorm:"size:255;not null" json:"key"`
	EncryptedValue string    `gorm:"type:text;not null" json:"-"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (EnvVar) TableName() string { return "env_vars" }

type Domain struct {
	ID          uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID       uint64     `gorm:"not null;index" json:"app_id"`
	Domain      string     `gorm:"size:512;uniqueIndex;not null" json:"domain"`
	Type        DomainType `gorm:"size:50;not null;default:'subdomain'" json:"type"`
	SSLEnabled  bool       `gorm:"default:false" json:"ssl_enabled"`
	CertExpiry  *time.Time `json:"cert_expiry"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (Domain) TableName() string { return "domains" }

type Volume struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID     uint64    `gorm:"not null;index" json:"app_id"`
	Name      string    `gorm:"size:255;not null" json:"name"`
	MountPath string    `gorm:"size:512;not null" json:"mount_path"`
	Size      string    `gorm:"size:50;default:'1G'" json:"size"` // e.g. "1G", "500M"
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (Volume) TableName() string { return "volumes" }

type Database struct {
	ID                      uint64       `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID                   uint64       `gorm:"not null;index" json:"app_id"`
	Type                    DatabaseType `gorm:"size:50;not null" json:"type"`
	ConnectionStringEncrypted string      `gorm:"type:text" json:"-"`
	ContainerID             string       `gorm:"size:255" json:"container_id"`
	CreatedAt               time.Time    `gorm:"autoCreateTime" json:"created_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (Database) TableName() string { return "databases" }

type CronJob struct {
	ID        uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	AppID     uint64     `gorm:"not null;index" json:"app_id"`
	Schedule  string     `gorm:"size:255;not null" json:"schedule"` // cron expression
	Command   string     `gorm:"size:1024;not null" json:"command"`
	Enabled   bool       `gorm:"default:true" json:"enabled"`
	LastRun   *time.Time `json:"last_run"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`

	App App `gorm:"foreignKey:AppID" json:"app,omitempty"`
}

func (CronJob) TableName() string { return "cron_jobs" }

type Setting struct {
	ID    uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	Key   string `gorm:"size:255;uniqueIndex;not null" json:"key"`
	Value string `gorm:"type:text" json:"value"`
}

func (Setting) TableName() string { return "settings" }

type SSHKey struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	PublicKey   string    `gorm:"type:text;not null" json:"public_key"`
	Fingerprint string    `gorm:"size:255;not null" json:"fingerprint"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (SSHKey) TableName() string { return "ssh_keys" }
