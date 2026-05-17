import { Shield, ShieldCheck, ShieldAlert, Globe, ExternalLink, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Domain } from '@/types';
import { cn } from '@/lib/utils';

interface DomainCardProps {
  domain: Domain;
  onRemove?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
  onVerify?: (id: string) => void;
}

const sslIcons: Record<string, { icon: typeof Shield; color: string }> = {
  active: { icon: ShieldCheck, color: 'text-emerald-400' },
  pending: { icon: Shield, color: 'text-amber-400' },
  none: { icon: Shield, color: 'text-zinc-500' },
  error: { icon: ShieldAlert, color: 'text-red-400' },
};

const sslLabels: Record<string, string> = {
  active: 'SSL Active',
  pending: 'SSL Pending',
  none: 'No SSL',
  error: 'SSL Error',
};

export function DomainCard({ domain, onRemove, onSetPrimary, onVerify }: DomainCardProps) {
  const sslIcon = sslIcons[domain.sslStatus] || sslIcons.none;
  const SslIcon = sslIcon.icon;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5">
            <Globe className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-100 truncate">{domain.hostname}</span>
              {domain.type === 'primary' && (
                <Badge variant="running" className="text-[10px]">Primary</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <SslIcon className={cn('h-3.5 w-3.5', sslIcon.color)} />
                <span className={cn('text-xs', sslIcon.color)}>{sslLabels[domain.sslStatus]}</span>
              </div>
              <Badge variant={domain.verified ? 'running' : 'outline'} className="text-[10px]">
                {domain.verified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            {!domain.verified && (
              <div className="mt-2 rounded-md bg-zinc-800/50 p-2.5 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300 mb-1">DNS Configuration</p>
                <p>Add a CNAME record pointing <code className="text-emerald-400">{domain.hostname}</code> to your server.</p>
                {onVerify && (
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => onVerify(domain.id)}>
                    Verify DNS
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {domain.type !== 'primary' && onSetPrimary && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSetPrimary(domain.id)}>
              Set Primary
            </Button>
          )}
          <a
            href={`https://${domain.hostname}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(domain.id)}>
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
