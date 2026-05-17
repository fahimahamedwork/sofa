import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  iconColor?: string;
}

export function StatCard({ icon: Icon, label, value, trend, iconColor = 'text-primary' }: StatCardProps) {
  return (
    <Card className="p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.value >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={cn(trend.value >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('rounded-lg bg-muted p-2', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
