import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  TournamentService,
  TournamentInfo,
  TournamentBracket,
  TournamentResult,
  BracketMatch,
} from '../../services/tournament.service';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SkeletonComponent } from '../../components/skeleton/skeleton.component';

@Component({
  selector: 'app-tournament',
  imports: [DecimalPipe, SkeletonComponent],
  templateUrl: './tournament.component.html',
  styleUrl: './tournament.component.scss',
})
export class TournamentComponent implements OnInit, OnDestroy {
  Math = Math;
  private svc    = inject(TournamentService);
  private ws     = inject(WebsocketService);
  private auth   = inject(AuthService);
  private toast  = inject(ToastService);
  private router = inject(Router);

  info    = signal<TournamentInfo | null>(null);
  bracket = signal<TournamentBracket | null>(null);
  result  = signal<TournamentResult | null>(null);
  loading = signal(true);
  actionLoading = signal(false);
  countdown = signal('');
  disconnectWarning = signal<{ seconds: number } | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private sub!: Subscription;

  get myId() { return this.auth.currentUser()?.id ?? 0; }

  // Matches del round actual
  currentMatches = computed(() =>
    (this.bracket()?.matches ?? []).filter(m => m.round === this.bracket()!.currentRound)
  );

  // Mi match en el round actual
  myMatch = computed(() => {
    const id = this.bracket()?.myMatchId;
    return id ? this.bracket()?.matches.find(m => m.matchId === id) ?? null : null;
  });

  // Estoy eliminado si no tengo match y el torneo está en curso
  isEliminated = computed(() => {
    const inf = this.info();
    return inf?.status === 'in_progress' && !this.myMatch() && inf.isRegistered;
  });

  ngOnInit() {
    this.loadCurrent();
    this.sub = this.ws.messages$.subscribe(msg => this.handleWs(msg));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    if (this.timer) clearInterval(this.timer);
  }

  private loadCurrent() {
    this.loading.set(true);
    this.svc.getCurrent().subscribe({
      next: (inf) => {
        this.info.set(inf);
        this.loading.set(false);
        this.startCountdown(inf.startsAt);
        if (inf.status === 'in_progress') this.loadBracket(inf.id);
        if (inf.status === 'finished')    this.loadResult(inf.id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo cargar la información del torneo.');
      },
    });
  }

  private loadBracket(id: string) {
    this.svc.getBracket(id).subscribe({
      next: (b) => this.bracket.set(b),
    });
  }

  private loadResult(id: string) {
    this.svc.getResult(id).subscribe({
      next: (r) => this.result.set(r),
    });
  }

  private startCountdown(isoDate: string) {
    if (this.timer) clearInterval(this.timer);
    const target = new Date(isoDate).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { this.countdown.set('¡El torneo está por comenzar!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown.set(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }

  private handleWs({ event, data }: { event: string; data: any }) {
    switch (event) {
      case 'tournament-start':
        this.toast.info('¡El torneo comenzó! Tus mesas están siendo asignadas...');
        this.info.update(i => i ? { ...i, status: 'in_progress' } : i);
        break;

      case 'tournament-match-assigned':
        this.toast.success(`Fuiste asignado a tu mesa. ¡Buena suerte!`);
        this.loadBracket(this.info()!.id);
        break;

      case 'tournament-round-end':
        this.toast.info(`Ronda ${data.round} terminada. Avanzaron ${data.survivors} jugadores.`);
        this.loadBracket(this.info()!.id);
        break;

      case 'tournament-finished':
        this.info.update(i => i ? { ...i, status: 'finished' } : i);
        this.loadResult(this.info()!.id);
        if (data.winnerId === this.myId) {
          this.toast.success('¡Ganaste el torneo! El premio ya está en tu billetera.');
        } else if (data.finalistId === this.myId) {
          this.toast.success('¡Llegaste a la final! El premio de finalista está en tu billetera.');
        }
        break;

      case 'tournament-cancelled':
        this.toast.warning('El torneo fue cancelado por falta de jugadores. La inscripción fue devuelta.');
        this.info.update(i => i ? { ...i, status: 'cancelled' } : i);
        break;

      case 'tournament-disconnect-warning':
        this.disconnectWarning.set({ seconds: data.seconds });
        const interval = setInterval(() => {
          this.disconnectWarning.update(w => w && w.seconds > 0 ? { seconds: w.seconds - 1 } : null);
          if (!this.disconnectWarning()) clearInterval(interval);
        }, 1000);
        break;
    }
  }

  register() {
    this.actionLoading.set(true);
    this.svc.register().subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.success('¡Inscripción confirmada! Te esperamos el sábado a las 18:00 hs.');
        this.info.update(i => i ? {
          ...i,
          isRegistered: true,
          registeredCount: i.registeredCount + 1,
          prizePool: (i.registeredCount + 1) * i.entryFee,
          winnerPrize: Math.floor((i.registeredCount + 1) * i.entryFee * 0.7),
          finalistPrize: Math.floor((i.registeredCount + 1) * i.entryFee * 0.1),
        } : i);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err.error?.error ?? 'No se pudo completar la inscripción.');
      },
    });
  }

  unregister() {
    this.actionLoading.set(true);
    this.svc.unregister().subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.toast.info('Inscripción cancelada. La entrada fue devuelta a tu billetera.');
        this.info.update(i => i ? {
          ...i,
          isRegistered: false,
          registeredCount: i.registeredCount - 1,
          prizePool: (i.registeredCount - 1) * i.entryFee,
          winnerPrize: Math.floor((i.registeredCount - 1) * i.entryFee * 0.7),
          finalistPrize: Math.floor((i.registeredCount - 1) * i.entryFee * 0.1),
        } : i);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err.error?.error ?? 'No se pudo cancelar la inscripción.');
      },
    });
  }

  goToMatch() {
    const m = this.myMatch();
    if (m?.tableId) this.router.navigate(['/game', m.tableId]);
  }

  matchPlayers(match: BracketMatch): string {
    return match.players.map(p => p.username).join(' vs ');
  }

  roundsArray(): number[] {
    const b = this.bracket();
    if (!b) return [];
    return Array.from({ length: b.totalRounds }, (_, i) => i + 1);
  }

  matchesForRound(round: number): BracketMatch[] {
    return (this.bracket()?.matches ?? []).filter(m => m.round === round);
  }
}
