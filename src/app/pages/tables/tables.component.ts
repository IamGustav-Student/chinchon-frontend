import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { GameService, TableSummary } from '../../services/game.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { TableCardComponent } from '../../components/table-card/table-card.component';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';

@Component({
  selector: 'app-tables',
  imports: [DecimalPipe, TableCardComponent, SkeletonComponent],
  templateUrl: './tables.component.html',
  styleUrl: './tables.component.scss',
})
export class TablesComponent implements OnInit {
  private game = inject(GameService);
  auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  tables = signal<TableSummary[]>([]);
  loading = signal(true);
  showCreateModal = signal(false);
  createError = signal('');
  createLoading = signal(false);

  // Opciones del modal
  selectedBet = signal(1000);
  selectedMaxPlayers = signal(2);
  selectedPointLimit = signal(100);

  readonly BETS = [500, 1000, 2500, 5000, 10000];
  readonly PLAYER_OPTIONS = [2, 4];
  readonly POINT_LIMITS = [50, 100];

  waiting = computed(() => this.tables().filter(t => t.status === 'waiting'));
  playing = computed(() => this.tables().filter(t => t.status === 'playing'));

  ngOnInit() {
    this.loadTables();
  }

  loadTables() {
    this.loading.set(true);
    this.game.listTables().subscribe({
      next: (t) => { this.tables.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  joinTable(id: string) {
    this.game.joinTable(id).subscribe({
      next: () => this.router.navigate(['/game', id]),
      error: (err) => this.toast.error(err.error?.error ?? 'No se pudo unir a la mesa.'),
    });
  }

  openCreateModal() {
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  createTable() {
    this.createLoading.set(true);
    this.createError.set('');
    this.game.createTable(this.selectedBet(), this.selectedMaxPlayers(), this.selectedPointLimit()).subscribe({
      next: (table) => {
        this.createLoading.set(false);
        this.showCreateModal.set(false);
        this.router.navigate(['/game', table.id]);
      },
      error: (err) => {
        const msg = err.error?.error ?? 'Error al crear la mesa.';
        this.createError.set(msg);
        this.toast.error(msg);
        this.createLoading.set(false);
      },
    });
  }
}
