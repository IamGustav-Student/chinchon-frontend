import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InboxService } from '../../services/inbox.service';
import { ToastService } from '../../services/toast.service';

export interface PlayerMenuTarget {
  id: number;
  username: string;
  avatar: string;
}

@Component({
  selector: 'app-player-menu',
  imports: [FormsModule],
  templateUrl: './player-menu.component.html',
  styleUrl: './player-menu.component.scss',
})
export class PlayerMenuComponent {
  @Input() target!: PlayerMenuTarget;
  @Output() close = new EventEmitter<void>();

  private router = inject(Router);
  private inbox  = inject(InboxService);
  private toast  = inject(ToastService);

  composing    = signal(false);
  messageText  = signal('');
  sendingMsg   = signal(false);

  visitProfile() {
    this.router.navigate(['/profile'], { queryParams: { userId: this.target.id } });
    this.close.emit();
  }

  addFriend() {
    this.toast.info(`Solicitud de amistad enviada a ${this.target.username}.`);
    this.close.emit();
  }

  openCompose() { this.composing.set(true); }

  sendMessage() {
    const body = this.messageText().trim();
    if (!body) return;
    this.sendingMsg.set(true);
    this.inbox.sendMessage(this.target.id, body).subscribe({
      next: () => {
        this.toast.success(`Mensaje enviado a ${this.target.username}.`);
        this.sendingMsg.set(false);
        this.close.emit();
      },
      error: () => {
        this.toast.error('No se pudo enviar el mensaje.');
        this.sendingMsg.set(false);
      },
    });
  }

  cancelCompose() {
    this.composing.set(false);
    this.messageText.set('');
  }
}
