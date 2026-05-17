import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  App,
  CreateAppRequest,
  UpdateAppRequest,
  Deployment,
  EnvVar,
  Domain,
  AddDomainRequest,
  Database,
  ProvisionDBRequest,
  AppMetrics,
  ServerStats,
  Setting,
  SSHKey,
  AddSSHKeyRequest,
  Activity,
} from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sofa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sofa_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// Apps
export const appsApi = {
  listApps: () => api.get<App[]>('/apps'),
  createApp: (data: CreateAppRequest) => api.post<App>('/apps', data),
  getApp: (slug: string) => api.get<App>(`/apps/${slug}`),
  updateApp: (slug: string, data: UpdateAppRequest) => api.patch<App>(`/apps/${slug}`, data),
  deleteApp: (slug: string) => api.delete(`/apps/${slug}`),
  startApp: (slug: string) => api.post(`/apps/${slug}/start`),
  stopApp: (slug: string) => api.post(`/apps/${slug}/stop`),
  restartApp: (slug: string) => api.post(`/apps/${slug}/restart`),
};

// Deployments
export const deploymentsApi = {
  listDeployments: (slug: string) => api.get<Deployment[]>(`/apps/${slug}/deployments`),
  createDeployment: (slug: string) => api.post<Deployment>(`/apps/${slug}/deployments`),
  getDeployment: (slug: string, id: string) => api.get<Deployment>(`/apps/${slug}/deployments/${id}`),
  rollback: (slug: string, id: string) => api.post(`/apps/${slug}/deployments/${id}/rollback`),
};

// Env Vars
export const envVarsApi = {
  listEnvVars: (slug: string) => api.get<EnvVar[]>(`/apps/${slug}/env`),
  createEnvVar: (slug: string, data: { key: string; value: string }) => api.post<EnvVar>(`/apps/${slug}/env`, data),
  updateEnvVar: (slug: string, id: string, data: { key: string; value: string }) => api.patch<EnvVar>(`/apps/${slug}/env/${id}`, data),
  deleteEnvVar: (slug: string, id: string) => api.delete(`/apps/${slug}/env/${id}`),
};

// Domains
export const domainsApi = {
  listDomains: (slug: string) => api.get<Domain[]>(`/apps/${slug}/domains`),
  addDomain: (slug: string, data: AddDomainRequest) => api.post<Domain>(`/apps/${slug}/domains`, data),
  removeDomain: (slug: string, id: string) => api.delete(`/apps/${slug}/domains/${id}`),
  verifyDomain: (slug: string, id: string) => api.post(`/apps/${slug}/domains/${id}/verify`),
  setPrimary: (slug: string, id: string) => api.post(`/apps/${slug}/domains/${id}/primary`),
  listAllDomains: () => api.get<Domain[]>('/domains'),
};

// Databases
export const databasesApi = {
  listDatabases: () => api.get<Database[]>('/databases'),
  provisionDB: (data: ProvisionDBRequest) => api.post<Database>('/databases', data),
  removeDB: (id: string) => api.delete(`/databases/${id}`),
};

// Metrics
export const metricsApi = {
  getAppMetrics: (slug: string) => api.get<AppMetrics>(`/apps/${slug}/metrics`),
  getServerStats: () => api.get<ServerStats>('/server/stats'),
};

// Settings
export const settingsApi = {
  getSettings: () => api.get<Setting[]>('/settings'),
  updateSettings: (data: Record<string, string>) => api.patch('/settings', data),
  listSSHKeys: () => api.get<SSHKey[]>('/settings/ssh-keys'),
  addSSHKey: (data: AddSSHKeyRequest) => api.post<SSHKey>('/settings/ssh-keys', data),
  removeSSHKey: (id: string) => api.delete(`/settings/ssh-keys/${id}`),
};

// Activity
export const activityApi = {
  getRecent: () => api.get<Activity[]>('/activity'),
};

export default api;
