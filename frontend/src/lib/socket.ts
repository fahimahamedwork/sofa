type MessageHandler = (data: unknown) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private token: string | null = null;
  private rooms: Set<string> = new Set();

  connect(token?: string): void {
    if (token) this.token = token;
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Clean up existing connection
    this.disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;

      // Authenticate if token is available
      if (this.token) {
        this.send({ action: 'auth', token: this.token });
      }

      // Re-join rooms
      this.rooms.forEach((room) => {
        this.send({ action: 'join', room });
      });
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { action, room, data } = message;

        // Dispatch to room-specific listeners
        if (room) {
          const handlers = this.listeners.get(room);
          if (handlers) {
            handlers.forEach((handler) => handler(data || message));
          }
        }

        // Also dispatch to action-specific listeners
        if (action) {
          const handlers = this.listeners.get(action);
          if (handlers) {
            handlers.forEach((handler) => handler(data || message));
          }
        }
      } catch (err) {
        // Non-JSON message, dispatch as raw data
        const handlers = this.listeners.get('message');
        if (handlers) {
          handlers.forEach((handler) => handler(event.data));
        }
      }
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting... attempt ${this.reconnectAttempts}`);
      this.connect();
    }, this.reconnectDelay * Math.min(this.reconnectAttempts + 1, 5));
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on manual disconnect
      this.ws.close();
      this.ws = null;
    }
  }

  joinRoom(room: string): void {
    this.rooms.add(room);
    this.send({ action: 'join', room });
  }

  leaveRoom(room: string): void {
    this.rooms.delete(room);
    this.listeners.delete(room);
    this.send({ action: 'leave', room });
  }

  on(event: string, callback: MessageHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: MessageHandler): void {
    this.listeners.get(event)?.delete(callback);
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Legacy emit support - sends as JSON with action field
  emit(event: string, ...args: unknown[]): void {
    const data = args[0] instanceof Object ? args[0] as Record<string, unknown> : {};
    this.send({ action: event, ...data });
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
