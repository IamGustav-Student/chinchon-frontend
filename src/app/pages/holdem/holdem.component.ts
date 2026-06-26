import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { HoldemService, HoldemTableSummary } from '../../services/holdem.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';

// Configuraciones de mesa disponibles
export const HOLDEM_CONFIGS = [
  { buyIn: 500,   blindsSmall: 5,   blindsBig: 10,  label: '$500'  },
  { buyIn: 1000,  blindsSmall: 10,  blindsBig: 20,  label: '$1.000' },
  { buyIn: 5000,  blindsSmall: 50,  blindsBig: 100, label: '$5.000' },
  { buyIn: 25000, blindsSmall: 250, blindsBig: 500, label: '$25.000' },
];

@Component({
  selector: 'app-holdem',
  imports: [DecimalPipe, SkeletonComponent],
  templateUrl: './holdem.component.html',
  styleUrl: './holdem.component.scss',
})
export class HoldemComponent implements OnInit {
  private svc   = inject(HoldemService);
  private router = inject(Router);
  private toast  = inject(ToastService);
  auth = inject(AuthService);

  tables  = signal<HoldemTableSummary[]>([]);
  loading = signal(true);
  showCreate = signal(false);
  createLoading = signal(false);

  selectedBuyIn    = signal(HOLDEM_CONFIGS[1].buyIn);
  selectedMaxPlayers = signal(6);

  readonly CONFIGS = HOLDEM_CONFIGS;
  readonly PLAYER_OPTIONS = [2, 4, 6];

  waiting = computed(() => this.tables().filter(t => t.status === 'waiting'));
  playing = computed(() => this.tables().filter(t => t.status === 'playing'));

  selectedConfig = computed(() => HOLDEM_CONFIGS.find(c => c.buyIn === this.selectedBuyIn()) ?? HOLDEM_CONFIGS[1]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.listTables().subscribe({
      next: (t) => { this.tables.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  join(id: string) {
    this.svc.joinTable(id).subscribe({
      next: () => this.router.navigate(['/holdem', id]),
      error: (err) => this.toast.error(err.error?.error ?? 'No se pudo unir a la mesa.'),
    });
  }

  create() {
    this.createLoading.set(true);
    this.svc.createTable(this.selectedBuyIn(), this.selectedMaxPlayers()).subscribe({
      next: (t) => {
        this.createLoading.set(false);
        this.showCreate.set(false);
        this.router.navigate(['/holdem', t.id]);
      },
      error: (err) => {
        this.createLoading.set(false);
        this.toast.error(err.error?.error ?? 'No se pudo crear la mesa.');
      },
    });
  }

  blindsLabel(t: HoldemTableSummary): string {
    return `$${t.blindsSmall}/$${t.blindsBig}`;
  }
}
