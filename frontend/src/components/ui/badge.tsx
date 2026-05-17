import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-emerald-600/20 text-emerald-400',
        secondary: 'border-transparent bg-zinc-800 text-zinc-300',
        destructive: 'border-transparent bg-red-600/20 text-red-400',
        outline: 'border-zinc-700 text-zinc-300',
        running: 'border-transparent bg-emerald-600/20 text-emerald-400',
        stopped: 'border-transparent bg-zinc-700/50 text-zinc-400',
        building: 'border-transparent bg-amber-600/20 text-amber-400',
        error: 'border-transparent bg-red-600/20 text-red-400',
        queued: 'border-transparent bg-sky-600/20 text-sky-400',
        healthy: 'border-transparent bg-emerald-600/20 text-emerald-400',
        failed: 'border-transparent bg-red-600/20 text-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
