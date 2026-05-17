export type AppStatus = 'running' | 'stopped' | 'building' | 'deploying' | 'error' | 'queued' | 'healthy' | 'failed';
export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';
export type SourceType = 'git' | 'docker_image' | 'dockerfile';
export type DomainSSLStatus = 'active' | 'pending' | 'none' | 'error';
export type DomainType = 'primary' | 'custom' | 'subdomain';
export type DatabaseType = 'postgresql' | 'mysql' | 'redis' | 'mongodb';
export type DatabaseStatus = 'running' | 'stopped' | 'provisioning';

// Frontend App type (camelCase - snakeToCamel converter handles the mapping)
export interface App {
  id: string;
  name: string;
  slug: string;
  status: AppStatus;
  framework: string;
  sourceType: SourceType;
  sourceUrl: string;
  branch: string;
  port: number;
  buildCmd: string;
  memoryLimit: number;
  cpuLimit: number;
  domains: Domain[];
  createdAt: string;
  updatedAt: string;
  containerId: string;
}

export interface Deployment {
  id: string;
  appId: string;
  status: DeploymentStatus;
  commitHash: string;
  commitMessage: string;
  branch: string;
  sourceType: SourceType;
  buildDuration: number;
  deployDuration: number;
  buildLog: string;
  createdAt: string;
  finishedAt: string;
}

export interface EnvVar {
  id: string;
  appId: string;
  key: string;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string;
  appId: string;
  domain: string;
  type: DomainType;
  sslEnabled: boolean;
  createdAt: string;
}

export interface Volume {
  id: string;
  appId: string;
  name: string;
  mountPath: string;
  size: string;
  createdAt: string;
}

export interface Database {
  id: string;
  appId: string;
  type: DatabaseType;
  connectionStringEncrypted: string;
  containerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CronJob {
  id: string;
  appId: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRunAt: string;
  createdAt: string;
}

export interface SSHKey {
  id: string;
  name: string;
  fingerprint: string;
  publicKey: string;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ServerStats {
  cpuUsage: number;
  cpuCores: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  diskUsage: number;
  diskTotal: number;
  diskUsed: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
  hostname: string;
  os: string;
  dockerVersion: string;
}

export interface AppMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

export interface Activity {
  id: string;
  type: 'deploy' | 'start' | 'stop' | 'restart' | 'error' | 'domain' | 'database';
  message: string;
  appName: string;
  appSlug: string;
  timestamp: string;
}

export interface LoginRequest {
  username?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: number;
}

export interface CreateAppRequest {
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  branch?: string;
  framework?: string;
  buildCmd?: string;
  port?: number;
  cpuLimit?: number;
  memoryLimit?: number;
}

export interface UpdateAppRequest {
  name?: string;
  port?: number;
  buildCmd?: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface ProvisionDBRequest {
  type: DatabaseType;
  connectionString: string;
}

export interface AddDomainRequest {
  domain: string;
  type: DomainType;
  sslEnabled?: boolean;
}

export interface AddSSHKeyRequest {
  name: string;
  publicKey: string;
}
