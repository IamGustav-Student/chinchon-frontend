import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { WalletService, WalletMovement, DepositInfo } from '../../services/wallet.service';
import { AvatarSvgComponent, AvatarConfig } from '../../components/avatar-svg/avatar-svg.component';
import { environment } from '../../../environments/environment';

const DEFAULT_CONFIG: AvatarConfig = {
  skin: '#f5c88a', hair: '#4a2800', style: 'short', eyes: '#4a7abf', acc: 'none',
};

const EMOJIS       = ['👨', '👩', '🧑', '👧', '👦', '👵', '👴', '🦁', '🦊', '🦅', '🏆', '🔥'];
const SKIN_TONES   = ['#fce4d0', '#f5c88a', '#e8a87c', '#c68642', '#8d5524', '#4a2512'];
const HAIR_COLORS  = ['#1a1a1a', '#4a2800', '#8b4513', '#d2691e', '#f5d060', '#e35335', '#9b59b6', '#c0c0c0'];
const EYE_COLORS   = ['#4a3728', '#8b6914', '#4a7abf', '#3a8c3f', '#6b4c8a', '#1a1a1a'];
const HAIR_STYLES: AvatarConfig['style'][] = ['short', 'long', 'curly', 'bald'];
const HAIR_STYLE_LABELS: Record<string, string> = {
  short: 'Corto', long: 'Largo', curly: 'Rizado', bald: 'Calvo',
};

@Component({
  selector: 'app-profile',
  imports: [DecimalPipe, DatePipe, FormsModule, AvatarSvgComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  auth = inject(AuthService);
  private wallet = inject(WalletService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  readonly EMOJIS           = EMOJIS;
  readonly SKIN_TONES       = SKIN_TONES;
  readonly HAIR_COLORS      = HAIR_COLORS;
  readonly EYE_COLORS       = EYE_COLORS;
  readonly HAIR_STYLES      = HAIR_STYLES;
  readonly HAIR_STYLE_LABELS = HAIR_STYLE_LABELS;

  history     = signal<WalletMovement[]>([]);
  stats       = signal({ games_played: 0, games_won: 0, games_lost: 0 });
  depositInfo = signal<DepositInfo | null>(null);
  saveLoading = signal(false);

  // Avatar state
  selectedAvatar      = signal(this.auth.currentUser()?.avatar ?? '👨');
  avatarMode          = signal<'emoji' | 'photo' | 'builder'>(this.detectMode());
  avatarConfig        = signal<AvatarConfig>(this.parseConfig(this.auth.currentUser()?.avatar));
  customAvatarPreview = signal<string | null>(null);

  // Bio state
  bio      = signal(this.auth.currentUser()?.bio ?? '');
  editBio  = signal(false);
  bioInput = signal(this.auth.currentUser()?.bio ?? '');

  activeTab = signal<'avatar' | 'deposit' | 'history'>('avatar');

  // Deposit form — plain properties for ngModel compatibility
  depositAmount        = 0;
  depositSenderName    = '';
  depositSenderBank    = '';
  depositTransactionId = '';
  depositAcceptTerms   = false;
  depositLoading = signal(false);
  depositSuccess = signal(false);
  depositError   = signal('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'deposit') this.activeTab.set('deposit');
    });
    this.wallet.getHistory().subscribe({ next: (h) => this.history.set(h) });
    this.wallet.getDepositInfo().subscribe({ next: (info) => this.depositInfo.set(info) });
    this.http.get<any>(`${environment.apiUrl}/perfil`).subscribe({
      next: (p) => this.stats.set({ games_played: p.games_played, games_won: p.games_won, games_lost: p.games_lost }),
    });
  }

  // ── Avatar helpers ────────────────────────────────────────────────────────

  private detectMode(): 'emoji' | 'photo' | 'builder' {
    const a = this.auth.currentUser()?.avatar;
    if (!a) return 'emoji';
    if (a.startsWith('{'))     return 'builder';
    if (a.startsWith('data:')) return 'photo';
    return 'emoji';
  }

  parseConfig(avatar?: string | null): AvatarConfig {
    try {
      if (avatar?.startsWith('{')) return { ...DEFAULT_CONFIG, ...JSON.parse(avatar) };
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  isCustomImage(avatar?: string | null): boolean {
    return !!avatar && avatar.startsWith('data:');
  }

  isAvatarConfig(avatar?: string | null): boolean {
    return !!avatar && avatar.startsWith('{');
  }

  setSkin(c: string)  { this.avatarConfig.set({ ...this.avatarConfig(), skin: c }); }
  setHair(c: string)  { this.avatarConfig.set({ ...this.avatarConfig(), hair: c }); }
  setEyes(c: string)  { this.avatarConfig.set({ ...this.avatarConfig(), eyes: c }); }
  setAcc(v: AvatarConfig['acc'])         { this.avatarConfig.set({ ...this.avatarConfig(), acc: v }); }
  setHairStyle(s: AvatarConfig['style']) { this.avatarConfig.set({ ...this.avatarConfig(), style: s }); }

  avatarConfigJson(): string { return JSON.stringify(this.avatarConfig()); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 128;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        this.selectedAvatar.set(dataUrl);
        this.customAvatarPreview.set(dataUrl);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  saveAvatar() {
    const avatar = this.avatarMode() === 'builder'
      ? JSON.stringify(this.avatarConfig())
      : this.selectedAvatar();
    this.saveLoading.set(true);
    this.http.put<any>(`${environment.apiUrl}/perfil`, { avatar }).subscribe({
      next: (updated) => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, avatar: updated.avatar });
        this.saveLoading.set(false);
      },
      error: () => this.saveLoading.set(false),
    });
  }

  // ── Bio ───────────────────────────────────────────────────────────────────

  startEditBio() {
    this.bioInput.set(this.bio());
    this.editBio.set(true);
  }

  cancelEditBio() { this.editBio.set(false); }

  saveBio() {
    const text = this.bioInput().trim().slice(0, 200);
    this.http.put<any>(`${environment.apiUrl}/perfil`, { bio: text }).subscribe({
      next: () => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, bio: text });
        this.bio.set(text);
        this.editBio.set(false);
      },
      error: () => {},
    });
  }

  // ── Deposit ───────────────────────────────────────────────────────────────

  submitDeposit() {
    if (!this.depositAmount || this.depositAmount <= 0) {
      this.depositError.set('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (!this.depositSenderName.trim()) {
      this.depositError.set('Ingresá el nombre del titular de la cuenta de origen.');
      return;
    }
    if (!this.depositSenderBank.trim()) {
      this.depositError.set('Ingresá el banco o billetera virtual de origen.');
      return;
    }
    if (!this.depositTransactionId.trim()) {
      this.depositError.set('Ingresá el comprobante o número de operación.');
      return;
    }
    if (!this.depositAcceptTerms) {
      this.depositError.set('Debés confirmar que el titular coincide con tu cuenta.');
      return;
    }
    this.depositLoading.set(true);
    this.depositError.set('');
    this.depositSuccess.set(false);
    this.wallet.deposit(this.depositAmount, this.depositSenderName, this.depositSenderBank, this.depositTransactionId).subscribe({
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
      },
    });
  }

  getWhatsAppDepositLink(): string {
    const text = `Hola, acabo de realizar una transferencia de $${this.depositAmount ?? 0} desde la cuenta de ${this.depositSenderName} (${this.depositSenderBank}). Comprobante: ${this.depositTransactionId}. Mi usuario es ${this.auth.currentUser()?.username ?? ''}.`;
    return `https://wa.me/5491123456789?text=${encodeURIComponent(text)}`;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  winRate(): string {
    const p = this.stats().games_played;
    if (!p) return '0%';
    return Math.round((this.stats().games_won / p) * 100) + '%';
  }

  movementLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: '+ Depósito', withdraw: '- Retiro',
      'game-win': '+ Ganancia', 'game-loss': '- Pérdida',
    };
    return labels[type] ?? type;
  }
}
