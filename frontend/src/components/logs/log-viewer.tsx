import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { socketManager } from '@/lib/socket';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface LogViewerProps {
  appId: string;
  className?: string;
}

const levelColors: Record<string, string> = {
  INFO: 'text-emerald-400',
  WARN: 'text-amber-400',
  WARNING: 'text-amber-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-zinc-500',
  FATAL: 'text-red-500',
};

function getLevelFromLine(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('ERR')) return 'ERROR';
  if (upper.includes('WARN') || upper.includes('WARNING')) return 'WARN';
  if (upper.includes('DEBUG') || upper.includes('DBG')) return 'DEBUG';
  if (upper.includes('FATAL')) return 'FATAL';
  return 'INFO';
}

export function LogViewer({ appId, className }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const pausedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('sofa_token');
    socketManager.connect(token || undefined);

    const room = `app:${appId}:logs`;
    socketManager.joinRoom(room);

    const handleLog = (data: unknown) => {
      if (pausedRef.current) return;
      const entry = data as { message?: string; data?: string; timestamp?: string; level?: string };
      const message = entry.message || entry.data || '';
      if (!message) return;
      setLogs((prev) => [
        ...prev.slice(-999),
        {
          timestamp: entry.timestamp || new Date().toISOString(),
          level: entry.level || getLevelFromLine(message),
          message,
        },
      ]);
    };

    socketManager.on(room, handleLog);

    return () => {
      socketManager.off(room, handleLog);
      socketManager.leaveRoom(room);
    };
  }, [appId]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleDownload = useCallback(() => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.level}: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, appId]);

  const filteredLogs = filter
    ? logs.filter((l) => l.message.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          <span className="ml-1 text-xs">{paused ? 'Resume' : 'Pause'}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Log content */}
      <ScrollArea className="flex-1 bg-zinc-950 rounded-md mt-2 border border-zinc-800">
        <div className="p-3 font-mono text-xs leading-5 min-h-[300px] max-h-[500px]">
          {filteredLogs.length === 0 ? (
            <p className="text-zinc-600">No logs available. Waiting for output...</p>
          ) : (
            filteredLogs.map((entry, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-zinc-600 shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn('shrink-0 w-12', levelColors[entry.level] || levelColors.INFO)}>
                  {entry.level}
                </span>
                <span className="text-zinc-300 break-all">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {paused && (
        <div className="text-center text-xs text-amber-400 mt-2">
          Log streaming paused. Click Resume to continue.
        </div>
      )}
    </div>
  );
}
