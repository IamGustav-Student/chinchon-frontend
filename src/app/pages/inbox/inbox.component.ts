import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

export interface PrivateMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  senderAvatar: string;
  recipientId: number;
  body: string;
  read: boolean;
  createdAt: string;
  parentId?: number;
  replies?: PrivateMessage[];
}

@Component({
  selector: 'app-inbox',
  imports: [DatePipe, SlicePipe, FormsModule],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  auth  = inject(AuthService);
  private http  = inject(HttpClient);
  private toast = inject(ToastService);

  messages = signal<PrivateMessage[]>([]);
  loading  = signal(true);
  selected = signal<PrivateMessage | null>(null);
  replyText = signal('');
  sendingReply = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<PrivateMessage[]>(`${environment.apiUrl}/messages`).subscribe({
      next: (msgs) => { this.messages.set(msgs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openMessage(msg: PrivateMessage) {
    this.selected.set(msg);
    this.replyText.set('');
    if (!msg.read) {
      this.http.put(`${environment.apiUrl}/messages/${msg.id}/read`, {}).subscribe({
        next: () => {
          this.messages.update(list => list.map(m => m.id === msg.id ? { ...m, read: true } : m));
        },
      });
    }
  }

  sendReply() {
    const msg = this.selected();
    const body = this.replyText().trim();
    if (!msg || !body) return;
    this.sendingReply.set(true);
    this.http.post<PrivateMessage>(`${environment.apiUrl}/messages`, {
      recipientId: msg.senderId,
      body,
      parentId: msg.id,
    }).subscribe({
      next: () => {
        this.replyText.set('');
        this.sendingReply.set(false);
        this.toast.success('Respuesta enviada.');
      },
      error: () => {
        this.sendingReply.set(false);
        this.toast.error('No se pudo enviar el mensaje.');
      },
    });
  }

  closeThread() { this.selected.set(null); }

  unreadCount() {
    return this.messages().filter(m => !m.read).length;
  }

  isCustomImage(avatar?: string | null): boolean {
    return !!avatar && avatar.startsWith('data:');
  }
}
