import { Link } from 'react-router-dom';
import { MoreVertical, Play, Square, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/app/status-badge';
import type { App } from '@/types';
import { cn } from '@/lib/utils';

interface AppCardProps {
  app: App;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onRestart?: (id: string) => void;
}

export function AppCard({ app, onStart, onStop, onRestart }: AppCardProps) {
  const status = app.status || 'stopped';

  return (
    <Card className="group hover:border-zinc-700 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'h-2.5 w-2.5 rounded-full shrink-0',
              status === 'running' ? 'bg-emerald-500' :
              status === 'building' ? 'bg-amber-500 animate-pulse-subtle' :
              status === 'stopped' ? 'bg-zinc-500' :
              'bg-red-500'
            )} />
            <div className="min-w-0">
              <Link
                to={`/apps/${app.id}`}
                className="text-sm font-semibold text-zinc-100 hover:text-emerald-400 transition-colors truncate block"
              >
                {app.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {app.framework || app.sourceType || 'docker'}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onStart?.(app.id)}>
                <Play className="mr-2 h-3.5 w-3.5" /> Start
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStop?.(app.id)}>
                <Square className="mr-2 h-3.5 w-3.5" /> Stop
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRestart?.(app.id)}>
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Restart
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <StatusBadge status={status} />
          <span className="text-xs text-zinc-500">
            {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Never deployed'}
          </span>
        </div>
      </div>
    </Card>
  );
}
