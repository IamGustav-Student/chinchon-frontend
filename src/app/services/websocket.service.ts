import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WsMessage {
  event: string;
  data: unknown;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private platformId = inject(PLATFORM_ID);
  messages$ = new Subject<WsMessage>();

  connect() {
    if (!isPlatformBrowser(this.platformId)) return;
    const token = localStorage.getItem('token');
    if (!token || this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${environment.wsUrl}?token=${token}`);

    this.ws.onmessage = (ev) => {
      try {
        this.messages$.next(JSON.parse(ev.data));
      } catch {}
    };

    this.ws.onerror = () => console.error('WebSocket error');
    this.ws.onclose = () => console.log('WebSocket cerrado');
  }

  send(event: string, data: unknown = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
