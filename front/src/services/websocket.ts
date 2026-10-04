import { getBaseUrl } from './api';

export type WebSocketListener = (event: string, data: any) => void;

class SentinelWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<WebSocketListener> = new Set();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isExplicitlyClosed = false;
  private _isConnected = false;

  public get isConnected(): boolean {
    return this._isConnected;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;
    this.cleanup();

    const baseUrl = getBaseUrl();
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this._isConnected = true;
        this.emit('connection_change', { connected: true });
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.event) {
            this.emit(payload.event, payload.data);
          }
        } catch {
          // If plain text (e.g. "pong")
        }
      };

      this.ws.onerror = () => {
        this._isConnected = false;
        this.emit('connection_change', { connected: false });
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.emit('connection_change', { connected: false });
        this.stopPing();

        if (!this.isExplicitlyClosed) {
          // Try reconnecting after 3 seconds
          this.reconnectTimer = setTimeout(() => {
            this.connect();
          }, 3000);
        }
      };
    } catch {
      this._isConnected = false;
      this.emit('connection_change', { connected: false });
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.cleanup();
  }

  public addListener(listener: WebSocketListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.forEach((fn) => {
      try {
        fn(event, data);
      } catch (err) {
        console.warn('[WebSocket] Listener error:', err);
      }
    });
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 15000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanup(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this._isConnected = false;
  }
}

export const wsClient = new SentinelWebSocketClient();
