import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private wallet = inject(WalletService);

  walletModal: 'deposit' | 'withdraw' | null = null;
  selectedAmount = signal(0);
  walletError = signal('');
  walletLoading = signal(false);

  readonly AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

  ngOnInit() {
    this.wallet.getBalance().subscribe({
      next: ({ balance }) => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, balance });
      },
    });
  }

  openModal(type: 'deposit' | 'withdraw') {
    this.walletModal = type;
    this.selectedAmount.set(0);
    this.walletError.set('');
  }

  closeModal() {
    this.walletModal = null;
  }

  confirmWallet() {
    const amount = this.selectedAmount();
    if (!amount) { this.walletError.set('Seleccioná un monto.'); return; }
    this.walletLoading.set(true);
    this.walletError.set('');

    const action = this.walletModal === 'deposit'
      ? this.wallet.deposit(amount)
      : this.wallet.withdraw(amount);

    action.subscribe({
      next: ({ balance }) => {
        const user = this.auth.currentUser();
        if (user) this.auth.currentUser.set({ ...user, balance });
        this.walletLoading.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.walletError.set(err.error?.error ?? 'Error al procesar.');
        this.walletLoading.set(false);
      },
    });
  }
}
