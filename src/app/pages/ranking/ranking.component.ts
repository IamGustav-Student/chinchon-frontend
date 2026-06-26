import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RankingService, RankingEntry } from '../../services/ranking.service';
import { AuthService } from '../../services/auth.service';
import { RankingPodiumComponent } from '../../components/ranking-podium/ranking-podium.component';

const PRIZES = [280000, 230000, 180000, 120000, 90000, 80000, 70000, 60000, 50000, 40000];

@Component({
  selector: 'app-ranking',
  imports: [DecimalPipe, RankingPodiumComponent],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.scss',
})
export class RankingComponent implements OnInit, OnDestroy {
  private rankingService = inject(RankingService);
  auth = inject(AuthService);

  ranking = signal<RankingEntry[]>([]);
  top3 = signal<RankingEntry[]>([]);
  nextReset = signal('');
  countdown = signal('');
  loading = signal(true);

  readonly PRIZES = PRIZES;
  readonly POS_CLASS = ['gold', 'silver', 'bronze'];

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.rankingService.getWeekly().subscribe({
      next: ({ ranking, nextReset }) => {
        this.ranking.set(ranking);
        this.top3.set(ranking.slice(0, 3));
        this.nextReset.set(nextReset);
        this.loading.set(false);
        this.startCountdown(nextReset);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private startCountdown(isoDate: string) {
    const target = new Date(isoDate).getTime();
    this.timer = setInterval(() => {
      const diff = target - Date.now();
      if (diff <= 0) { this.countdown.set('¡Reset en curso!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown.set(`${d}d ${h}h ${m}m ${s}s`);
    }, 1000);
  }

  myPosition(): number {
    const uid = this.auth.currentUser()?.id;
    return this.ranking().findIndex(r => r.id === uid) + 1;
  }
}
