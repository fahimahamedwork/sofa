import { useParams } from 'react-router-dom';
import { LogViewer } from '@/components/logs/log-viewer';

export function AppLogsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Logs</h2>
      <LogViewer appId={id} className="h-full" />
    </div>
  );
}
