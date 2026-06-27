import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TrucoService, TrucoTableSummary } from '../../services/truco.service';
import { ToastService } from '../../services/toast.service';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';

const BUYIN_OPTIONS = [
  { buyIn: 0,     label: 'Gratis'  },
  { buyIn: 500,   label: '$500'    },
  { buyIn: 1000,  label: '$1.000'  },
  { buyIn: 5000,  label: '$5.000'  },
];

@Component({
  selector: 'app-truco',
  imports: [SkeletonComponent],
  templateUrl: './truco.component.html',
  styleUrl: './truco.component.scss',
})
export class TrucoComponent implements OnInit {
  private svc    = inject(TrucoService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  tables        = signal<TrucoTableSummary[]>([]);
  loading       = signal(true);
  showCreate    = signal(false);
  createLoading = signal(false);

  selectedBuyIn   = signal(0);
  selectedPlayers = signal<2 | 4>(2);
  selectedLimit   = signal<15 | 30>(15);

  readonly BUYIN_OPTIONS = BUYIN_OPTIONS;

  waiting = computed(() => this.tables().filter(t => t.status === 'waiting'));
  playing = computed(() => this.tables().filter(t => t.status === 'playing'));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.listTables().subscribe({
      next: t => { this.tables.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  join(id: string) {
    this.svc.joinTable(id).subscribe({
      next: () => this.router.navigate(['/truco', id]),
      error: err => this.toast.error(err.error?.error ?? 'No se pudo unir a la mesa.'),
    });
  }

  create() {
    this.createLoading.set(true);
    this.svc.createTable(this.selectedBuyIn(), this.selectedPlayers(), this.selectedLimit()).subscribe({
      next: t => {
        this.createLoading.set(false);
        this.showCreate.set(false);
        this.router.navigate(['/truco', t.id]);
      },
      error: err => {
        this.createLoading.set(false);
        this.toast.error(err.error?.error ?? 'No se pudo crear la mesa.');
      },
    });
  }

  buyInLabel(buyIn: number): string {
    return buyIn === 0 ? 'Gratis' : `$${buyIn.toLocaleString('es-AR')}`;
  }
}
