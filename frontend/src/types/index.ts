export type AppStatus = 'running' | 'stopped' | 'building' | 'deploying' | 'error' | 'queued' | 'healthy' | 'failed';
export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'success' | 'failed' | 'cancelled';
export type SourceType = 'git' | 'docker-image' | 'dockerfile';
export type DomainSSLStatus = 'active' | 'pending' | 'none' | 'error';
export type DomainType = 'primary' | 'custom' | 'subdomain';
export type DatabaseType = 'postgresql' | 'mysql' | 'redis' | 'mongodb';
export type DatabaseStatus = 'running' | 'stopped' | 'provisioning';

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
  buildCommand: string;
  startCommand: string;
  memoryLimit: number;
  cpuLimit: number;
  domains: Domain[];
  createdAt: string;
  updatedAt: string;
  lastDeployAt: string;
  lastDeployCommit: string;
  url: string;
}

export interface Deployment {
  id: string;
  appId: string;
  status: DeploymentStatus;
  commit: string;
  commitMessage: string;
  branch: string;
  sourceType: SourceType;
  buildDuration: number;
  deployDuration: number;
  logs: string;
  createdAt: string;
  finishedAt: string;
}

export interface EnvVar {
  id: string;
  appId: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string;
  appId: string;
  hostname: string;
  type: DomainType;
  sslStatus: DomainSSLStatus;
  verified: boolean;
  createdAt: string;
}

export interface Volume {
  id: string;
  appId: string;
  name: string;
  mountPath: string;
  sizeGB: number;
  createdAt: string;
}

export interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  status: DatabaseStatus;
  appId: string;
  appName: string;
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
  connectionUrl: string;
  sizeMB: number;
  createdAt: string;
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
  memoryLimit: number;
  networkIn: number;
  networkOut: number;
  requestCount: number;
  responseTime: number;
  timestamps: string[];
  cpuHistory: number[];
  memoryHistory: number[];
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
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface CreateAppRequest {
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  branch?: string;
  framework?: string;
  buildCommand?: string;
  startCommand?: string;
  port?: number;
  envVars?: Record<string, string>;
}

export interface UpdateAppRequest {
  name?: string;
  port?: number;
  buildCommand?: string;
  startCommand?: string;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface ProvisionDBRequest {
  name: string;
  type: DatabaseType;
  appId?: string;
}

export interface AddDomainRequest {
  hostname: string;
  type: DomainType;
}

export interface AddSSHKeyRequest {
  name: string;
  publicKey: string;
}
