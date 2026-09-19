import { Injectable, inject, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { MatchSocketClientEvent, MatchSocketServerEvent } from '@quiz/contracts';

export type SocketConnectionState = 'connected' | 'reconnecting' | 'disconnected';

@Injectable({ providedIn: 'root' })
export class MatchSocketService {
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;
  private isRefreshingToken = false;

  readonly connectionState = signal<SocketConnectionState>('disconnected');

  connect(): void {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    const token = this.authService.getAccessToken() || '';

    // Connect through window.location.origin (which proxies /socket.io via proxy.conf.json in dev)
    this.socket = io(window.location.origin, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.isRefreshingToken = false;
      this.connectionState.set('connected');
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        this.connectionState.set('disconnected');
      } else {
        this.connectionState.set('reconnecting');
      }
    });

    this.socket.on('connect_error', (error: Error & { data?: any }) => {
      this.connectionState.set('reconnecting');
      const errorMsg = error.message || error.data?.message || '';
      const errorCode = error.data?.code || '';

      if (
        (errorMsg.includes('UNAUTHORIZED') ||
          errorCode === 'UNAUTHORIZED' ||
          errorMsg.includes('Authentication token')) &&
        !this.isRefreshingToken
      ) {
        this.isRefreshingToken = true;
        this.authService.refreshToken().subscribe({
          next: (res) => {
            this.isRefreshingToken = false;
            if (this.socket) {
              this.socket.auth = { token: res.accessToken };
              this.socket.connect();
            }
          },
          error: () => {
            this.isRefreshingToken = false;
            this.connectionState.set('disconnected');
          },
        });
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionState.set('disconnected');
    }
  }

  on<T = any>(event: MatchSocketServerEvent | string, callback: (payload: T) => void): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);
  }

  off<T = any>(event: MatchSocketServerEvent | string, callback: (payload: T) => void): void {
    this.socket?.off(event, callback);
  }

  emit<T = any>(
    event: MatchSocketClientEvent | string,
    payload?: any,
    ack?: (response: T) => void,
  ): void {
    if (!this.socket) {
      this.connect();
    }
    if (ack) {
      this.socket?.emit(event, payload, ack);
    } else {
      this.socket?.emit(event, payload);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
