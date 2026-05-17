import { Link, useParams, useLocation } from 'react-router-dom';
import { Play, Square, RotateCcw, ExternalLink, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/app/status-badge';
import { ResourceBar } from '@/components/dashboard/resource-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp, useAppMetrics, useStartApp, useStopApp, useRestartApp, useCreateDeployment, useAppDomains } from '@/hooks/useApp';
import { cn, formatDateRelative, formatBytes } from '@/lib/utils';
import type { AppStatus } from '@/types';

const subNav = [
  { path: '', label: 'Overview' },
  { path: '/deployments', label: 'Deployments' },
  { path: '/env', label: 'Environment' },
  { path: '/domains', label: 'Domains' },
  { path: '/logs', label: 'Logs' },
  { path: '/terminal', label: 'Terminal' },
  { path: '/settings', label: 'Settings' },
];

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { data: app, isLoading } = useApp(id);
  const { data: metrics } = useAppMetrics(id!);
  const { data: domains } = useAppDomains(id!);
  const startApp = useStartApp();
  const stopApp = useStopApp();
  const restartApp = useRestartApp();
  const createDeployment = useCreateDeployment(id!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Application not found</p>
        <Link to="/apps">
          <Button variant="outline" className="mt-4">Back to Applications</Button>
        </Link>
      </div>
    );
  }

  const basePath = `/apps/${id}`;
  const status = (app.status || 'stopped') as AppStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-3 w-3 rounded-full',
              status === 'running' ? 'bg-emerald-500' :
              status === 'building' ? 'bg-amber-500 animate-pulse-subtle' :
              'bg-muted-foreground'
            )} />
            <h1 className="text-2xl font-bold text-foreground">{app.name}</h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {app.framework || 'N/A'} &middot; Port {app.port || 'N/A'} &middot; {app.sourceType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => createDeployment.mutate()}>
            <Rocket className="h-3.5 w-3.5 mr-1" /> Redeploy
          </Button>
          <Button variant="outline" size="sm" onClick={() => startApp.mutate(id!)} disabled={status === 'running'}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => stopApp.mutate(id!)} disabled={status === 'stopped'}>
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => restartApp.mutate(id!)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 border-b border-border -mb-6 pb-0 overflow-x-auto">
        {subNav.map((item) => {
          const fullPath = item.path ? `${basePath}${item.path}` : basePath;
          const isActive = location.pathname === fullPath;

          return (
            <Link
              key={item.path}
              to={fullPath}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                isActive
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Overview content */}
      <div className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Application Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Framework</span>
                <span className="text-foreground">{app.framework || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="secondary" className="text-[10px]">{app.sourceType}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source URL</span>
                <span className="text-foreground font-mono text-xs truncate max-w-[200px]">{app.sourceUrl || 'N/A'}</span>
              </div>
              {app.branch && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="text-foreground font-mono text-xs">{app.branch}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Port</span>
                <span className="text-foreground">{app.port || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resource Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ResourceBar
                label="CPU"
                value={metrics?.cpuUsage ?? 0}
              />
              <ResourceBar
                label="Memory"
                value={metrics?.memoryUsage ?? 0}
                detail={formatBytes(metrics?.memoryUsage ?? 0)}
              />
              <ResourceBar
                label="Network In"
                value={0}
                detail={formatBytes(metrics?.networkIn ?? 0)}
              />
              <ResourceBar
                label="Network Out"
                value={0}
                detail={formatBytes(metrics?.networkOut ?? 0)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Domains */}
        {domains && domains.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{domain.domain}</span>
                      {domain.type === 'primary' && (
                        <Badge variant="running" className="text-[10px]">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={domain.sslEnabled ? 'running' : 'outline'} className="text-[10px]">
                        {domain.sslEnabled ? 'SSL' : 'No SSL'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
