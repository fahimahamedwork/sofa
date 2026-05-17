-- Sofa Panel Database Schema

CREATE TABLE apps (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL DEFAULT 'git',
    source_url VARCHAR(1024),
    branch VARCHAR(255) DEFAULT 'main',
    framework VARCHAR(100),
    build_cmd VARCHAR(1024),
    port INTEGER DEFAULT 3000,
    status VARCHAR(50) NOT NULL DEFAULT 'stopped',
    container_id VARCHAR(255),
    image_id VARCHAR(255),
    cpu_limit DOUBLE PRECISION DEFAULT 0.5,
    memory_limit INTEGER DEFAULT 512,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    source_url VARCHAR(1024),
    branch VARCHAR(255),
    commit_hash VARCHAR(255),
    image_id VARCHAR(255),
    build_log TEXT,
    config JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deployments_app_id ON deployments(app_id);

CREATE TABLE env_vars (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_env_vars_app_id ON env_vars(app_id);
CREATE UNIQUE INDEX idx_env_vars_app_key ON env_vars(app_id, key);

CREATE TABLE domains (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    domain VARCHAR(512) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'subdomain',
    ssl_enabled BOOLEAN DEFAULT FALSE,
    cert_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domains_app_id ON domains(app_id);

CREATE TABLE volumes (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mount_path VARCHAR(512) NOT NULL,
    size VARCHAR(50) DEFAULT '1G',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_volumes_app_id ON volumes(app_id);

CREATE TABLE databases (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    connection_string_encrypted TEXT,
    container_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_databases_app_id ON databases(app_id);

CREATE TABLE cron_jobs (
    id BIGSERIAL PRIMARY KEY,
    app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    schedule VARCHAR(255) NOT NULL,
    command VARCHAR(1024) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cron_jobs_app_id ON cron_jobs(app_id);

CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT
);

CREATE TABLE ssh_keys (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
