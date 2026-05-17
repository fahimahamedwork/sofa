import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
}

const alertIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const alertStyles = {
  default: 'border-border bg-card text-foreground',
  destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
  success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  info: 'border-sky-500/50 bg-sky-500/10 text-sky-400',
};

function Alert({ className, variant = 'default', children, ...props }: AlertProps) {
  const Icon = alertIcons[variant];

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        alertStyles[variant],
        className
      )}
      role="alert"
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
