import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { WalletService, WalletMovement } from '../../services/wallet.service';
import { environment } from '../../../environments/environment';

const AVATARS = ['🎴','🃏','🎲','🦁','🐯','🦊','🐺','🦅','🦋','🌟','🔥','💎','🏆','⚡','🎭'];

@Component({
  selector: 'app-profile',
  imports: [DecimalPipe, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private wallet = inject(WalletService);
  private http = inject(HttpClient);

  readonly AVATARS = AVATARS;

  history = signal<WalletMovement[]>([]);
  stats = signal({ games_played: 0, games_won: 0, games_lost: 0 });
  saveLoading = signal(false);

  selectedAvatar = signal(this.auth.currentUser()?.avatar ?? '🎴');

  ngOnInit() {
    this.wallet.getHistory().subscribe({ next: (h) => this.history.set(h) });
    this.http.get<any>(`${environment.apiUrl}/perfil`).subscribe({
      next: (p) => this.stats.set({ games_played: p.games_played, games_won: p.games_won, games_lost: p.games_lost }),
    });
  }

  selectAvatar(a: string) {
    this.selectedAvatar.set(a);
  }

  saveAvatar() {
    this.saveLoading.set(true);
    this.http.put<any>(`${environment.apiUrl}/perfil`, { avatar: this.selectedAvatar() }).subscribe({
      next: (updated) => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, avatar: updated.avatar });
        this.saveLoading.set(false);
      },
      error: () => this.saveLoading.set(false),
    });
  }

  winRate(): string {
    const p = this.stats().games_played;
    if (!p) return '0%';
    return Math.round((this.stats().games_won / p) * 100) + '%';
  }

  movementLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: '+ Depósito',
      withdraw: '- Retiro',
      'game-win': '+ Ganancia',
      'game-loss': '- Pérdida',
    };
    return labels[type] ?? type;
  }
}
