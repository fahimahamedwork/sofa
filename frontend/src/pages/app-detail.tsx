import { Link, useParams, useLocation } from 'react-router-dom';
import { Play, Square, RotateCcw, ExternalLink, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/app/status-badge';
import { ResourceBar } from '@/components/dashboard/resource-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { useApp, useAppMetrics, useStartApp, useStopApp, useRestartApp, useCreateDeployment } from '@/hooks/useApp';
import { cn, formatDateRelative, formatBytes, truncateCommit } from '@/lib/utils';

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
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data: app, isLoading } = useApp(slug!);
  const { data: metrics } = useAppMetrics(slug!);
  const startApp = useStartApp();
  const stopApp = useStopApp();
  const restartApp = useRestartApp();
  const createDeployment = useCreateDeployment(slug!);

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
        <p className="text-zinc-500">Application not found</p>
        <Link to="/apps">
          <Button variant="outline" className="mt-4">Back to Applications</Button>
        </Link>
      </div>
    );
  }

  const basePath = `/apps/${slug}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-3 w-3 rounded-full',
              app.status === 'running' ? 'bg-emerald-500' :
              app.status === 'building' ? 'bg-amber-500 animate-pulse-subtle' :
              'bg-zinc-500'
            )} />
            <h1 className="text-2xl font-bold text-zinc-50">{app.name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {app.framework} &middot; Port {app.port} &middot; Deployed {app.lastDeployAt ? formatDateRelative(app.lastDeployAt) : 'never'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Visit
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => createDeployment.mutate()}>
            <Rocket className="h-3.5 w-3.5 mr-1" /> Redeploy
          </Button>
          <Button variant="outline" size="sm" onClick={() => startApp.mutate(slug!)} disabled={app.status === 'running'}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => stopApp.mutate(slug!)} disabled={app.status === 'stopped'}>
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => restartApp.mutate(slug!)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 border-b border-zinc-800 -mb-6 pb-0">
        {subNav.map((item) => {
          const fullPath = item.path ? `${basePath}${item.path}` : basePath;
          const isActive = location.pathname === fullPath;

          return (
            <Link
              key={item.path}
              to={fullPath}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                isActive
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
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
                <span className="text-zinc-400">Status</span>
                <StatusBadge status={app.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Framework</span>
                <span className="text-zinc-200">{app.framework || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Source</span>
                <Badge variant="secondary" className="text-[10px]">{app.sourceType}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Port</span>
                <span className="text-zinc-200">{app.port}</span>
              </div>
              {app.lastDeployCommit && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Last Commit</span>
                  <span className="text-zinc-200 font-mono text-xs">{truncateCommit(app.lastDeployCommit)}</span>
                </div>
              )}
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
                value={metrics ? (metrics.memoryUsage / metrics.memoryLimit) * 100 : 0}
                detail={`${formatBytes(metrics?.memoryUsage ?? 0)} / ${formatBytes(metrics?.memoryLimit ?? 0)}`}
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
        {app.domains && app.domains.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {app.domains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200">{domain.hostname}</span>
                      {domain.type === 'primary' && (
                        <Badge variant="running" className="text-[10px]">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={domain.sslStatus === 'active' ? 'running' : 'outline'} className="text-[10px]">
                        {domain.sslStatus === 'active' ? 'SSL' : 'No SSL'}
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
