import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InboxService {
  private http = inject(HttpClient);
  unreadCount = signal(0);

  fetchUnread() {
    this.http.get<{ count: number }>(`${environment.apiUrl}/messages/unread-count`).subscribe({
      next: ({ count }) => this.unreadCount.set(count),
      error: () => {},
    });
  }

  sendMessage(recipientId: number, body: string, parentId?: number) {
    return this.http.post(`${environment.apiUrl}/messages`, { recipientId, body, parentId });
  }
}
