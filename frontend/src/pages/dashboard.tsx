import { Link } from 'react-router-dom';
import { Play, Square, HardDrive, Package } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { ResourceBar } from '@/components/dashboard/resource-bar';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApps, useServerStats } from '@/hooks/useApp';
import { activityApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { Activity } from '@/types';
import { formatBytes } from '@/lib/utils';

export function DashboardPage() {
  const { data: apps, isLoading: appsLoading } = useApps();
  const { data: stats, isLoading: statsLoading } = useServerStats();
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: async () => {
      const { data } = await activityApi.getRecent();
      if (Array.isArray(data)) return data;
      return [];
    },
  });

  const running = apps?.filter((a) => a.status === 'running').length ?? 0;
  const stopped = apps?.filter((a) => a.status === 'stopped').length ?? 0;
  const building = apps?.filter((a) => a.status === 'building' || a.status === 'deploying').length ?? 0;
  const diskUsed = stats ? formatBytes(stats.diskUsed) : '0 B';

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your hosting environment</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {appsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : (
          <>
            <StatCard icon={Play} label="Running Apps" value={running} iconColor="text-emerald-400" />
            <StatCard icon={Square} label="Stopped Apps" value={stopped} iconColor="text-muted-foreground" />
            <StatCard icon={Package} label="Building" value={building} iconColor="text-amber-400" />
            <StatCard icon={HardDrive} label="Disk Used" value={diskUsed} iconColor="text-sky-400" />
          </>
        )}
      </div>

      {/* Server Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Server Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))
          ) : (
            <>
              <ResourceBar
                label="CPU"
                value={stats?.cpuUsage ?? 0}
                detail={`${stats?.cpuCores ?? 0} cores`}
              />
              <ResourceBar
                label="RAM"
                value={stats ? (stats.memoryUsed / stats.memoryTotal) * 100 : 0}
                detail={`${formatBytes(stats?.memoryUsed ?? 0)} / ${formatBytes(stats?.memoryTotal ?? 0)}`}
              />
              <ResourceBar
                label="Disk"
                value={stats?.diskUsage ?? 0}
                detail={`${formatBytes(stats?.diskUsed ?? 0)} / ${formatBytes(stats?.diskTotal ?? 0)}`}
              />
              <ResourceBar
                label="Network"
                value={0}
                detail={`In: ${formatBytes(stats?.networkIn ?? 0)} / Out: ${formatBytes(stats?.networkOut ?? 0)}`}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Applications + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Apps */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Applications</CardTitle>
            <Link to="/apps">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {appsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 mb-2" />
              ))
            ) : apps && apps.length > 0 ? (
              <div className="space-y-2">
                {apps.slice(0, 5).map((app) => (
                  <Link
                    key={app.id}
                    to={`/apps/${app.id}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        app.status === 'running' ? 'bg-emerald-500' :
                        app.status === 'building' ? 'bg-amber-500' :
                        'bg-muted-foreground'
                      }`} />
                      <span className="text-sm text-foreground">{app.name}</span>
                    </div>
                    <StatusBadge status={app.status || 'stopped'} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No applications yet</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 mb-2" />
              ))
            ) : (
              <ActivityFeed activities={(activities as Activity[]) || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
