import { Link } from 'react-router-dom';
import { MoreVertical, Play, Square, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/app/status-badge';
import type { App } from '@/types';
import { cn } from '@/lib/utils';

interface AppListItemProps {
  app: App;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  onRestart?: (id: string) => void;
}

export function AppListItem({ app, onStart, onStop, onRestart }: AppListItemProps) {
  const status = app.status || 'stopped';

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group">
      {/* Status dot */}
      <div className={cn(
        'h-2.5 w-2.5 rounded-full shrink-0',
        status === 'running' ? 'bg-emerald-500' :
        status === 'building' ? 'bg-amber-500 animate-pulse-subtle' :
        status === 'stopped' ? 'bg-zinc-500' :
        'bg-red-500'
      )} />

      {/* App name */}
      <Link
        to={`/apps/${app.id}`}
        className="text-sm font-medium text-zinc-100 hover:text-emerald-400 transition-colors min-w-0 truncate w-40"
      >
        {app.name}
      </Link>

      {/* Framework */}
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {app.framework || app.sourceType || 'docker'}
      </Badge>

      {/* Status */}
      <StatusBadge status={status} />

      {/* Source */}
      <span className="text-xs text-zinc-500 flex-1 truncate">
        {app.sourceUrl || 'N/A'}
      </span>

      {/* Actions */}
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
  );
}
