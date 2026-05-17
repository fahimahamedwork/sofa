import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { socketManager } from '@/lib/socket';
import { cn } from '@/lib/utils';
import '@xterm/xterm/css/xterm.css';

interface WebTerminalProps {
  appId: string;
  className?: string;
}

export function WebTerminal({ appId, className }: WebTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const token = localStorage.getItem('sofa_token');
    socketManager.connect(token || undefined);
    socketManager.joinRoom(`app:${appId}:terminal`);

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#09090b',
        foreground: '#fafafa',
        cursor: '#10b981',
        cursorAccent: '#09090b',
        black: '#18181b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#0ea5e9',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#fafafa',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#38bdf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitRef.current = fitAddon;

    // Handle terminal input - send as raw WebSocket message
    xterm.onData((data) => {
      socketManager.send({
        action: 'terminal:input',
        room: `app:${appId}:terminal`,
        data: data,
      });
    });

    // Handle terminal output from room listener
    const handleOutput = (message: unknown) => {
      const msg = message as { data?: string };
      if (msg.data) {
        xterm.write(msg.data);
      }
    };
    socketManager.on(`app:${appId}:terminal:output`, handleOutput);

    // Handle resize
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // ignore fit errors during cleanup
      }
    };

    window.addEventListener('resize', handleResize);

    // Initial message
    xterm.writeln('\x1b[32mConnected to terminal...\x1b[0m\r\n');

    return () => {
      window.removeEventListener('resize', handleResize);
      socketManager.off(`app:${appId}:terminal:output`, handleOutput);
      socketManager.leaveRoom(`app:${appId}:terminal`);
      xterm.dispose();
    };
  }, [appId]);

  return (
    <div className={cn('rounded-md border border-border overflow-hidden', className)}>
      <div ref={termRef} className="h-[500px] w-full" />
    </div>
  );
}
