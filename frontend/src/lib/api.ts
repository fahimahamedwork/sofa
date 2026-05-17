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
import { snakeToCamel, camelToSnake } from '@/lib/utils';

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
  // Convert camelCase request data to snake_case for backend
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = camelToSnake(config.data);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Unwrap backend {success: true, data: ...} envelope
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = snakeToCamel(response.data.data);
    } else if (response.data && typeof response.data === 'object') {
      response.data = snakeToCamel(response.data);
    }
    return response;
  },
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
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/settings/password', data),
};

// Apps
export const appsApi = {
  listApps: () => api.get<App[]>('/apps'),
  createApp: (data: CreateAppRequest) => api.post<App>('/apps', data),
  getApp: (id: string) => api.get<App>(`/apps/${id}`),
  updateApp: (id: string, data: UpdateAppRequest) => api.put<App>(`/apps/${id}`, data),
  deleteApp: (id: string) => api.delete(`/apps/${id}`),
  startApp: (id: string) => api.post(`/apps/${id}/start`),
  stopApp: (id: string) => api.post(`/apps/${id}/stop`),
  restartApp: (id: string) => api.post(`/apps/${id}/restart`),
};

// Deployments
export const deploymentsApi = {
  listDeployments: (appId: string) => api.get<Deployment[]>(`/apps/${appId}/deployments`),
  createDeployment: (appId: string) => api.post<Deployment>(`/apps/${appId}/deployments`, {}),
  getDeployment: (appId: string, id: string) => api.get<Deployment>(`/deployments/${id}`),
  rollback: (appId: string, id: string) => api.post(`/deployments/${appId}/rollback/${id}`, {}),
};

// Env Vars
export const envVarsApi = {
  listEnvVars: (appId: string) => api.get<EnvVar[]>(`/apps/${appId}/env-vars`),
  createEnvVar: (appId: string, data: { key: string; value: string }) => api.post<EnvVar>(`/apps/${appId}/env-vars`, data),
  updateEnvVar: (appId: string, data: { key: string; value: string }) => api.put<EnvVar>(`/apps/${appId}/env-vars`, data),
  deleteEnvVar: (id: string) => api.delete(`/env-vars/${id}`),
};

// Domains
export const domainsApi = {
  listDomains: (appId: string) => api.get<Domain[]>(`/apps/${appId}/domains`),
  listAllDomains: () => api.get<Domain[]>('/domains'),
  addDomain: (appId: string, data: AddDomainRequest) => api.post<Domain>(`/apps/${appId}/domains`, data),
  removeDomain: (id: string) => api.delete(`/domains/${id}`),
  verifyDomain: (id: string) => api.post(`/domains/${id}/verify`, {}),
  setPrimary: (id: string) => api.post(`/domains/${id}/set-primary`, {}),
};

// Databases
export const databasesApi = {
  listDatabases: () => api.get<Database[]>('/databases'),
  provisionDB: (data: ProvisionDBRequest) => api.post<Database>('/databases', data),
  removeDB: (id: string) => api.delete(`/databases/${id}`),
};

// Metrics
export const metricsApi = {
  getAppMetrics: (id: string) => api.get<AppMetrics>(`/metrics/apps/${id}`),
  getServerStats: () => api.get<ServerStats>('/metrics/server'),
};

// Settings
export const settingsApi = {
  getSettings: () => api.get<Setting[]>('/settings'),
  updateSettings: (data: Record<string, string>) => api.put('/settings', { settings: data }),
  listSSHKeys: () => api.get<SSHKey[]>('/settings/ssh-keys'),
  addSSHKey: (data: AddSSHKeyRequest) => api.post<SSHKey>('/settings/ssh-keys', data),
  removeSSHKey: (id: string) => api.delete(`/settings/ssh-keys/${id}`),
  updateIPWhitelist: (ips: string) => api.put('/settings', { settings: { ip_whitelist: ips } }),
};

// Activity
export const activityApi = {
  getRecent: () => api.get<Activity[]>('/activity'),
};

export default api;
