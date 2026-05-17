import { Progress } from '@/components/ui/progress';
import { cn, getResourceColor } from '@/lib/utils';

interface ResourceBarProps {
  label: string;
  value: number;
  detail?: string;
  className?: string;
}

export function ResourceBar({ label, value, detail, className }: ResourceBarProps) {
  const color = getResourceColor(value);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <div className="flex items-center gap-2">
          {detail && <span className="text-zinc-500">{detail}</span>}
          <span className="font-medium text-zinc-200">{value.toFixed(1)}%</span>
        </div>
      </div>
      <Progress value={value} indicatorClassName={color} />
    </div>
  );
}
