import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { HoldemService } from '../../services/holdem.service';
import { ToastService } from '../../services/toast.service';
import { AudioService } from '../../services/audio.service';
import { PokerCardComponent, PokerSuit } from '../../components/poker-card/poker-card.component';
import { WaitingTableComponent, WaitingSeat } from '../../components/waiting-table/waiting-table.component';

export interface PokerCard { suit: PokerSuit; value: number; }

export interface HoldemPlayer {
  id: number;
  username: string;
  avatar: string;
  stack: number;
  currentBet: number;
  folded: boolean;
  isAllIn: boolean;
  seatIndex: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  holeCards: PokerCard[] | null;   // solo viene para el jugador local
  lastAction: string | null;       // 'fold'|'call'|'check'|'raise'|'allin'|null
}

export interface HoldemGameState {
  id: string;
  status: 'waiting' | 'playing' | 'showdown' | 'hand_end' | 'finished';
  phase: 'preflop' | 'flop' | 'turn' | 'river' | null;
  players: HoldemPlayer[];
  communityCards: PokerCard[];
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: number[] }[];
  currentTurn: number | null;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  buyIn: number;
  blindsSmall: number;
  blindsBig: number;
  maxRebuys: number;
  rebuysLeft: number;
}

export interface HandResult {
  winners: { playerId: number; amount: number; hand: string }[];
  showdownCards: { playerId: number; cards: PokerCard[] }[];
}

@Component({
  selector: 'app-holdem-game',
  imports: [PokerCardComponent, DecimalPipe, WaitingTableComponent],
  templateUrl: './holdem-game.component.html',
  styleUrl: './holdem-game.component.scss',
})
export class HoldemGameComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private ws     = inject(WebsocketService);
  auth    = inject(AuthService);
  private holdem = inject(HoldemService);
  private toast  = inject(ToastService);
  private audio  = inject(AudioService);

  tableId = '';
  gameState  = signal<HoldemGameState | null>(null);
  handResult = signal<HandResult | null>(null);
  showLeaveConfirm = signal(false);
  raiseAmount = signal(0);
  showRaiseSlider = signal(false);
  muted = signal(false);
  newCommunityCount = signal(0);  // para animar cartas comunitarias nuevas

  private sub!: Subscription;
  private handResultTimer: ReturnType<typeof setTimeout> | null = null;

  get myId() { return this.auth.currentUser()?.id ?? 0; }

  me = computed(() => this.gameState()?.players.find(p => p.id === this.myId) ?? null);

  opponents = computed(() =>
    (this.gameState()?.players ?? [])
      .filter(p => p.id !== this.myId)
      .sort((a, b) => a.seatIndex - b.seatIndex)
  );

  isMyTurn = computed(() => this.gameState()?.currentTurn === this.myId);
  canCheck  = computed(() => this.isMyTurn() && (this.gameState()?.callAmount ?? 0) === 0);
  canCall   = computed(() => this.isMyTurn() && (this.gameState()?.callAmount ?? 0) > 0);
  canRaise  = computed(() => this.isMyTurn() && (this.gameState()?.maxRaise ?? 0) > 0);

  phaseLabel = computed(() => {
    const p = this.gameState()?.phase;
    return p ? ({ preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' }[p]) : '';
  });

  waitingSeats = computed((): WaitingSeat[] => {
    const players = this.gameState()?.players ?? [];
    const total   = 4;
    const myId    = this.myId;
    const filled: WaitingSeat[] = players.map(p => ({
      username: p.username,
      avatar: p.avatar || '♠',
      isMe: p.id === myId,
      isEmpty: false,
      sub: `$${p.stack}`,
    }));
    const empty: WaitingSeat[] = Array.from({ length: total - filled.length }, () => ({
      username: '',
      avatar: '',
      isMe: false,
      isEmpty: true,
    }));
    return [...filled, ...empty];
  });

  // Determinar si el jugador es bust y puede recomprar
  canRebuy = computed(() => {
    const me = this.me();
    const gs = this.gameState();
    return me && me.stack === 0 && gs && gs.rebuysLeft > 0 && gs.status === 'playing';
  });

  ngOnInit() {
    this.tableId = this.route.snapshot.paramMap.get('id') ?? '';
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe(msg => this.handleWs(msg));
    this.ws.send('holdem-join-table', { tableId: this.tableId });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ws.disconnect();
    if (this.handResultTimer) clearTimeout(this.handResultTimer);
  }

  private handleWs({ event, data }: { event: string; data: any }) {
    switch (event) {
      case 'holdem-game-state':
        this.gameState.set(data);
        this.raiseAmount.set(data.minRaise ?? 0);
        break;

      case 'holdem-your-turn':
        this.audio.yourTurn();
        this.showRaiseSlider.set(false);
        this.raiseAmount.set(this.gameState()?.minRaise ?? 0);
        break;

      case 'holdem-community-cards': {
        const prev = this.gameState()?.communityCards.length ?? 0;
        this.gameState.update(s => s ? { ...s, communityCards: data.cards, phase: data.phase } : s);
        this.newCommunityCount.set(data.cards.length - prev);
        setTimeout(() => this.newCommunityCount.set(0), 400);
        break;
      }

      case 'holdem-action':
        this.gameState.update(s => {
          if (!s) return s;
          return {
            ...s,
            players: s.players.map(p =>
              p.id === data.playerId
                ? { ...p, lastAction: data.action, currentBet: data.totalBet ?? p.currentBet,
                    stack: data.stack ?? p.stack, folded: data.action === 'fold' || p.folded,
                    isAllIn: data.action === 'allin' || p.isAllIn }
                : p
            ),
            pot: data.pot ?? s.pot,
            currentTurn: data.nextPlayerId ?? s.currentTurn,
            callAmount: data.callAmount ?? s.callAmount,
          };
        });
        if (data.action === 'fold' && data.playerId !== this.myId) this.audio.discard();
        if (data.action === 'raise' || data.action === 'allin') this.audio.draw();
        break;

      case 'holdem-showdown':
        this.gameState.update(s => s ? { ...s, status: 'showdown' } : s);
        this.toast.info('¡Showdown! Revelando cartas...');
        break;

      case 'holdem-hand-end':
        this.handResult.set(data);
        this.gameState.update(s => s ? { ...s, status: 'hand_end' } : s);
        if (data.winners?.some((w: any) => w.playerId === this.myId)) {
          this.audio.win();
          this.toast.success(`¡Ganaste $${data.winners.find((w: any) => w.playerId === this.myId)?.amount.toLocaleString()}!`);
        } else {
          this.audio.lose();
        }
        this.handResultTimer = setTimeout(() => {
          this.handResult.set(null);
        }, 5000);
        break;

      case 'holdem-game-finished':
        this.gameState.update(s => s ? { ...s, status: 'finished' } : s);
        this.toast.info('La mesa se cerró.');
        break;

      case 'holdem-player-joined':
        this.toast.info(`${data.username} se sentó en la mesa.`);
        this.audio.join();
        if (data.id) {
          this.gameState.update(s => {
            if (!s) return s;
            if (s.players.some(p => p.id === data.id)) return s;
            return {
              ...s,
              players: [...s.players, {
                id: data.id, username: data.username, avatar: data.avatar || '♠',
                stack: data.stack ?? s.buyIn, currentBet: 0, folded: false,
                isAllIn: false, seatIndex: data.seatIndex ?? s.players.length,
                isDealer: false, isSmallBlind: false, isBigBlind: false,
                holeCards: null, lastAction: null,
              }],
            };
          });
        }
        break;

      case 'holdem-player-left':
        this.toast.warning(`${data.username} abandonó la mesa.`);
        break;

      case 'holdem-error':
        this.toast.error(data.message);
        break;
    }
  }

  fold()  { if (!this.isMyTurn()) return; this.ws.send('holdem-fold',  { tableId: this.tableId }); }
  check() { if (!this.canCheck()) return; this.ws.send('holdem-check', { tableId: this.tableId }); }
  call()  { if (!this.canCall())  return; this.ws.send('holdem-call',  { tableId: this.tableId }); }
  allIn() { if (!this.isMyTurn()) return; this.ws.send('holdem-allin', { tableId: this.tableId }); }

  raise() {
    if (!this.canRaise()) return;
    this.ws.send('holdem-raise', { tableId: this.tableId, amount: this.raiseAmount() });
    this.showRaiseSlider.set(false);
  }

  rebuy() {
    this.holdem.rebuy(this.tableId).subscribe({
      next: () => this.toast.info('Recompra realizada.'),
      error: (err) => this.toast.error(err.error?.error ?? 'No se pudo recomprar.'),
    });
  }

  confirmLeave()  { this.showLeaveConfirm.set(true); }
  cancelLeave()   { this.showLeaveConfirm.set(false); }
  leaveTable()    { this.router.navigate(['/holdem']); }

  actionLabel(action: string | null): string {
    const labels: Record<string, string> = {
      fold: 'Fold', check: 'Check', call: 'Call', raise: 'Raise', allin: 'All-in',
    };
    return action ? (labels[action] ?? action) : '';
  }

  toggleMute() { this.muted.set(this.audio.toggleMute()); }

  isNewCommunity(index: number): boolean {
    const total = this.gameState()?.communityCards.length ?? 0;
    const newCount = this.newCommunityCount();
    return index >= total - newCount;
  }

  handWinner(playerId: number): { amount: number; hand: string } | undefined {
    return this.handResult()?.winners.find(w => w.playerId === playerId);
  }

  showdownCards(playerId: number): PokerCard[] {
    return this.handResult()?.showdownCards?.find(s => s.playerId === playerId)?.cards ?? [];
  }

  hasShowdownCards(playerId: number): boolean {
    return (this.handResult()?.showdownCards ?? []).some(s => s.playerId === playerId);
  }

  playerUsername(playerId: number): string {
    const players = this.gameState()?.players ?? [];
    for (const p of players) { if (p.id === playerId) return p.username; }
    return 'Jugador';
  }
}
