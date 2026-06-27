import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WalletService, WalletMovement } from '../../services/wallet.service';
import { environment } from '../../../environments/environment';

const AVATARS = ['👨', '👩', '🧑', '👧', '👦', '👵', '👴', '🦁', '🦊', '🦅', '🏆', '🔥'];

@Component({
  selector: 'app-profile',
  imports: [DecimalPipe, DatePipe, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private wallet = inject(WalletService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  readonly AVATARS = AVATARS;

  history = signal<WalletMovement[]>([]);
  stats = signal({ games_played: 0, games_won: 0, games_lost: 0 });
  saveLoading = signal(false);

  selectedAvatar = signal(this.auth.currentUser()?.avatar ?? '👨');
  customAvatarPreview = signal<string | null>(null);
  activeTab = signal<'avatar' | 'deposit' | 'history'>('avatar');

  // Formulario de depósito
  depositAmount = signal<number | null>(null);
  depositSenderName = signal<string>('');
  depositSenderBank = signal<string>('');
  depositTransactionId = signal<string>('');
  depositAcceptTerms = signal<boolean>(false);
  depositLoading = signal<boolean>(false);
  depositSuccess = signal<boolean>(false);
  depositError = signal<string>('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'deposit') {
        this.activeTab.set('deposit');
      }
    });

    this.wallet.getHistory().subscribe({ next: (h) => this.history.set(h) });
    this.http.get<any>(`${environment.apiUrl}/perfil`).subscribe({
      next: (p) => this.stats.set({ games_played: p.games_played, games_won: p.games_won, games_lost: p.games_lost }),
    });
  }

  selectAvatar(a: string) {
    this.selectedAvatar.set(a);
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 128;
        const MAX_HEIGHT = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          this.selectedAvatar.set(dataUrl);
          this.customAvatarPreview.set(dataUrl);
        }
      };
      img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  }

  isCustomImage(avatar?: string | null): boolean {
    return avatar ? avatar.length > 8 : false;
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

  submitDeposit() {
    if (!this.depositAmount() || this.depositAmount()! <= 0) {
      this.depositError.set('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (!this.depositSenderName().trim()) {
      this.depositError.set('Ingresá el nombre del titular de la cuenta de origen.');
      return;
    }
    if (!this.depositSenderBank().trim()) {
      this.depositError.set('Ingresá el banco o billetera virtual de origen.');
      return;
    }
    if (!this.depositTransactionId().trim()) {
      this.depositError.set('Ingresá el comprobante o número de operación.');
      return;
    }
    if (!this.depositAcceptTerms()) {
      this.depositError.set('Debés confirmar que el titular coincide con tu titular de cuenta.');
      return;
    }

    this.depositLoading.set(true);
    this.depositError.set('');
    this.depositSuccess.set(false);

    this.wallet.deposit(this.depositAmount()!).subscribe({
      next: ({ balance }) => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, balance });

        this.wallet.getHistory().subscribe({ next: (h) => this.history.set(h) });
        this.depositSuccess.set(true);
        this.depositLoading.set(false);
      },
      error: (err) => {
        this.depositError.set(err.error?.error ?? 'Error al procesar el depósito.');
        this.depositLoading.set(false);
      }
    });
  }

  getWhatsAppDepositLink(): string {
    const text = `Hola, acabo de realizar una transferencia de $${this.depositAmount() ?? 0} desde la cuenta de ${this.depositSenderName()} (${this.depositSenderBank()}). Comprobante: ${this.depositTransactionId()}. Mi usuario es ${this.auth.currentUser()?.username ?? ''}.`;
    return `https://wa.me/5491123456789?text=${encodeURIComponent(text)}`;
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
