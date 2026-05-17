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
import { snakeToCamel } from '@/lib/utils';

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

export function useApp(slug: string) {
  return useQuery({
    queryKey: ['apps', slug],
    queryFn: async () => {
      const { data } = await appsApi.getApp(slug);
      return data;
    },
    enabled: !!slug,
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

export function useUpdateApp(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateAppRequest) => {
      const res = await appsApi.updateApp(slug, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
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
    mutationFn: async (slug: string) => {
      await appsApi.deleteApp(slug);
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
    mutationFn: async (slug: string) => {
      await appsApi.startApp(slug);
    },
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
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
    mutationFn: async (slug: string) => {
      await appsApi.stopApp(slug);
    },
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
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
    mutationFn: async (slug: string) => {
      await appsApi.restartApp(slug);
    },
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
      queryClient.invalidateQueries({ queryKey: ['apps'] });
      toast.success('Application restarted');
    },
    onError: () => {
      toast.error('Failed to restart application');
    },
  });
}

// Deployments
export function useDeployments(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'deployments'],
    queryFn: async () => {
      const { data } = await deploymentsApi.listDeployments(slug);
      // Backend returns {deployments: [...], total, page, page_size}
      if (data && typeof data === 'object' && 'deployments' in data) {
        return (data as { deployments: Deployment[] }).deployments;
      }
      if (Array.isArray(data)) {
        return data as Deployment[];
      }
      return [] as Deployment[];
    },
    enabled: !!slug,
  });
}

export function useCreateDeployment(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await deploymentsApi.createDeployment(slug);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'deployments'] });
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
      toast.success('Deployment triggered');
    },
    onError: () => {
      toast.error('Failed to trigger deployment');
    },
  });
}

export function useRollback(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deploymentId: string) => {
      await deploymentsApi.rollback(slug, deploymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'deployments'] });
      queryClient.invalidateQueries({ queryKey: ['apps', slug] });
      toast.success('Rollback initiated');
    },
    onError: () => {
      toast.error('Failed to rollback');
    },
  });
}

// Env Vars
export function useEnvVars(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'env'],
    queryFn: async () => {
      const { data } = await envVarsApi.listEnvVars(slug);
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!slug,
  });
}

export function useCreateEnvVar(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const res = await envVarsApi.createEnvVar(slug, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'env'] });
      toast.success('Environment variable added');
    },
    onError: () => {
      toast.error('Failed to add environment variable');
    },
  });
}

export function useUpdateEnvVar(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; key: string; value: string }) => {
      const res = await envVarsApi.updateEnvVar(slug, id, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'env'] });
      toast.success('Environment variable updated');
    },
    onError: () => {
      toast.error('Failed to update environment variable');
    },
  });
}

export function useDeleteEnvVar(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await envVarsApi.deleteEnvVar(slug, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'env'] });
      toast.success('Environment variable removed');
    },
    onError: () => {
      toast.error('Failed to remove environment variable');
    },
  });
}

// Domains
export function useAppDomains(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'domains'],
    queryFn: async () => {
      const { data } = await domainsApi.listDomains(slug);
      if (Array.isArray(data)) return data;
      return [];
    },
    enabled: !!slug,
  });
}

export function useAddDomain(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AddDomainRequest) => {
      const res = await domainsApi.addDomain(slug, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'domains'] });
      toast.success('Domain added');
    },
    onError: () => {
      toast.error('Failed to add domain');
    },
  });
}

export function useRemoveDomain(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await domainsApi.removeDomain(slug, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps', slug, 'domains'] });
      toast.success('Domain removed');
    },
    onError: () => {
      toast.error('Failed to remove domain');
    },
  });
}

// Metrics
export function useAppMetrics(slug: string) {
  return useQuery({
    queryKey: ['apps', slug, 'metrics'],
    queryFn: async () => {
      const { data } = await metricsApi.getAppMetrics(slug);
      // Backend returns {app_id, app_name, status, metrics: {...}}
      if (data && typeof data === 'object' && 'metrics' in data) {
        return snakeToCamel<AppMetrics>((data as { metrics: unknown }).metrics);
      }
      return snakeToCamel<AppMetrics>(data);
    },
    enabled: !!slug,
    refetchInterval: 10000,
  });
}

export function useServerStats() {
  return useQuery({
    queryKey: ['server', 'stats'],
    queryFn: async () => {
      const { data } = await metricsApi.getServerStats();
      return snakeToCamel<ServerStats>(data);
    },
    refetchInterval: 10000,
  });
}
