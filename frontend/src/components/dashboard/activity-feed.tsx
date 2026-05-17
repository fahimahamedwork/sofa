import { formatDistanceToNow } from 'date-fns';
import { Rocket, Play, Square, RotateCcw, AlertTriangle, Globe, Database } from 'lucide-react';
import type { Activity } from '@/types';
import { cn } from '@/lib/utils';

const activityIcons: Record<Activity['type'], { icon: typeof Rocket; color: string }> = {
  deploy: { icon: Rocket, color: 'text-amber-400 bg-amber-400/10' },
  start: { icon: Play, color: 'text-primary bg-primary/10' },
  stop: { icon: Square, color: 'text-muted-foreground bg-muted' },
  restart: { icon: RotateCcw, color: 'text-sky-400 bg-sky-400/10' },
  error: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
  domain: { icon: Globe, color: 'text-purple-400 bg-purple-400/10' },
  database: { icon: Database, color: 'text-cyan-400 bg-cyan-400/10' },
};

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <div className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity) => {
        const { icon: Icon, color } = activityIcons[activity.type] || activityIcons.deploy;

        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={cn('mt-0.5 rounded-md p-1.5', color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.appName} &middot; {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
