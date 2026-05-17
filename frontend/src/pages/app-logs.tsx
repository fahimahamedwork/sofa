import { useParams } from 'react-router-dom';
import { LogViewer } from '@/components/logs/log-viewer';

export function AppLogsPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Logs</h2>
      <LogViewer appId={slug} className="h-full" />
    </div>
  );
}
