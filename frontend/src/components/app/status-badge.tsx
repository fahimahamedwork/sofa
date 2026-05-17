import { Badge } from '@/components/ui/badge';
import type { AppStatus, DeploymentStatus } from '@/types';

interface StatusBadgeProps {
  status: AppStatus | DeploymentStatus;
}

const statusVariantMap: Record<string, 'running' | 'stopped' | 'building' | 'error' | 'queued' | 'healthy' | 'failed'> = {
  running: 'running',
  healthy: 'healthy',
  success: 'healthy',
  stopped: 'stopped',
  cancelled: 'stopped',
  building: 'building',
  deploying: 'building',
  queued: 'queued',
  error: 'error',
  failed: 'failed',
};

const statusLabels: Record<string, string> = {
  running: 'Running',
  healthy: 'Healthy',
  success: 'Success',
  stopped: 'Stopped',
  cancelled: 'Cancelled',
  building: 'Building',
  deploying: 'Deploying',
  queued: 'Queued',
  error: 'Error',
  failed: 'Failed',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || 'stopped';
  const label = statusLabels[status] || status;

  return <Badge variant={variant}>{label}</Badge>;
}
