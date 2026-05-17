import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  appsApi,
  deploymentsApi,
  envVarsApi,
  domainsApi,
  metricsApi,
} from '@/lib/api';
import type {
  App,
  Deployment,
  AppMetrics,
  ServerStats,
  CreateAppRequest,
  UpdateAppRequest,
  AddDomainRequest,
} from '@/types';
import { toast } from 'sonner';

// App queries
export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const { data } = await appsApi.listApps();
      // Backend returns {apps: [...], total, page, page_size} - extract the apps array
      if (data && typeof data === 'object' && 'apps' in data) {
        return (data as { apps: App[] }).apps;
      }
      // Fallback: if data is already an array
      if (Array.isArray(data)) {
        return data as App[];
      }
      return [] as App[];
    },
  });
}

export function useApp(id: string | undefined) {
  return useQuery({
    queryKey: ['apps', id],
    queryFn: async () => {
      const { data } = await appsApi.getApp(id!);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAppRequest) => {
      const res = await appsApi.createApp(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application created successfully');
    },
    onError: () => {
      toast.error('Failed to create application');
    },
  });
}

export function useUpdateApp(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateAppRequest) => {
      const res = await appsApi.updateApp(id, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application updated');
    },
    onError: () => {
      toast.error('Failed to update application');
    },
  });
}

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await appsApi.deleteApp(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application deleted');
    },
    onError: () => {
      toast.error('Failed to delete application');
    },
  });
}

export function useStartApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await appsApi.startApp(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['apps', id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application started');
    },
    onError: () => {
      toast.error('Failed to start application');
    },
  });
}

export function useStopApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await appsApi.stopApp(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['apps', id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application stopped');
    },
    onError: () => {
      toast.error('Failed to stop application');
    },
  });
}

export function useRestartApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await appsApi.restartApp(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['apps', id] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application restarted');
    },
    onError: () => {
      toast.error('Failed to restart application');
    },
  });
}

// Deployments
export function useDeployments(appId: string) {
  return useQuery({
    queryKey: ['apps', appId, 'deployments'],
    queryFn: async () => {
      const { data } = await deploymentsApi.listDeployments(appId);
      // Backend returns {deployments: [...], total, page, page_size}
      if (data && typeof data === 'object' && 'deployments' in data) {
        return (data as { deployments: Deployment[] }).deployments;
      }
      if (Array.isArray(data)) {
        return data as Deployment[];
      }
      return [] as Deployment[];
    },
    enabled: !!appId,
  });
}

export function useCreateDeployment(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await deploymentsApi.createDeployment(appId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'deployments'] });
      queryClient.invalidateQueries({ queryKey: ['apps', appId] });
      toast.success('Deployment triggered');
    },
    onError: () => {
      toast.error('Failed to trigger deployment');
    },
  });
}

export function useRollback(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deploymentId: string) => {
      await deploymentsApi.rollback(appId, deploymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'deployments'] });
      queryClient.invalidateQueries({ queryKey: ['apps', appId] });
      toast.success('Rollback initiated');
    },
    onError: () => {
      toast.error('Failed to rollback');
    },
  });
}

// Env Vars
export function useEnvVars(appId: string) {
  return useQuery({
    queryKey: ['apps', appId, 'env'],
    queryFn: async () => {
      const { data } = await envVarsApi.listEnvVars(appId);
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!appId,
  });
}

export function useCreateEnvVar(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const res = await envVarsApi.createEnvVar(appId, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'env'] });
      toast.success('Environment variable added');
    },
    onError: () => {
      toast.error('Failed to add environment variable');
    },
  });
}

export function useUpdateEnvVar(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const res = await envVarsApi.updateEnvVar(appId, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'env'] });
      toast.success('Environment variable updated');
    },
    onError: () => {
      toast.error('Failed to update environment variable');
    },
  });
}

export function useDeleteEnvVar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, appId }: { id: string; appId: string }) => {
      await envVarsApi.deleteEnvVar(id);
    },
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'env'] });
      toast.success('Environment variable removed');
    },
    onError: () => {
      toast.error('Failed to remove environment variable');
    },
  });
}

// Domains
export function useAppDomains(appId: string) {
  return useQuery({
    queryKey: ['apps', appId, 'domains'],
    queryFn: async () => {
      const { data } = await domainsApi.listDomains(appId);
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!appId,
  });
}

export function useAddDomain(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddDomainRequest) => {
      const res = await domainsApi.addDomain(appId, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'domains'] });
      toast.success('Domain added');
    },
    onError: () => {
      toast.error('Failed to add domain');
    },
  });
}

export function useRemoveDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, appId }: { id: string; appId: string }) => {
      await domainsApi.removeDomain(id);
    },
    onSuccess: (_, { appId }) => {
      queryClient.invalidateQueries({ queryKey: ['apps', appId, 'domains'] });
      toast.success('Domain removed');
    },
    onError: () => {
      toast.error('Failed to remove domain');
    },
  });
}

// Metrics
export function useAppMetrics(id: string) {
  return useQuery({
    queryKey: ['apps', id, 'metrics'],
    queryFn: async () => {
      const { data } = await metricsApi.getAppMetrics(id);
      // Backend returns {appId, appName, status, metrics: {...}}
      if (data && typeof data === 'object' && 'metrics' in data) {
        return (data as { metrics: AppMetrics }).metrics;
      }
      return data as AppMetrics;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}

export function useServerStats() {
  return useQuery({
    queryKey: ['server', 'stats'],
    queryFn: async () => {
      const { data } = await metricsApi.getServerStats();
      return data as ServerStats;
    },
    refetchInterval: 10000,
  });
}
