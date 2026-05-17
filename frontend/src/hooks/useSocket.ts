import { useEffect, useCallback, useRef, useState } from 'react';
import { socketManager } from '@/lib/socket';

export function useSocket(event?: string, handler?: (...args: unknown[]) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const [connected, setConnected] = useState(socketManager.connected);

  useEffect(() => {
    const token = localStorage.getItem('sofa_token');
    socketManager.connect(token || undefined);

    // Poll connection state
    const interval = setInterval(() => {
      setConnected(socketManager.connected);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!event || !handlerRef.current) return;

    const callback = (...args: unknown[]) => {
      handlerRef.current?.(...args);
    };

    socketManager.on(event, callback);

    return () => {
      socketManager.off(event, callback);
    };
  }, [event]);

  const joinRoom = useCallback((room: string) => {
    socketManager.joinRoom(room);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketManager.leaveRoom(room);
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketManager.emit(event, ...args);
  }, []);

  return {
    connected,
    joinRoom,
    leaveRoom,
    emit,
  };
}
