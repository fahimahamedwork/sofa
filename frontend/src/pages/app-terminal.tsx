import { useParams } from 'react-router-dom';
import { WebTerminal } from '@/components/terminal/web-terminal';
import { Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { socketManager } from '@/lib/socket';
import { useState } from 'react';

export function AppTerminalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [connected, setConnected] = useState(socketManager.connected);

  if (!slug) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Terminal</h2>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="h-3.5 w-3.5" /> Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <WifiOff className="h-3.5 w-3.5" /> Disconnected
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (socketManager.connected) {
                socketManager.disconnect();
                setConnected(false);
              } else {
                const token = localStorage.getItem('sofa_token');
                socketManager.connect(token || undefined);
                setConnected(true);
              }
            }}
          >
            {connected ? 'Disconnect' : 'Reconnect'}
          </Button>
        </div>
      </div>
      <WebTerminal appId={slug} />
    </div>
  );
}
