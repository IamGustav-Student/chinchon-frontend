import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { ToastService } from '../../services/toast.service';
import { AudioService } from '../../services/audio.service';
import { CardComponent } from '../../components/card/card.component';
import { PlayerAvatarComponent } from '../../components/player-avatar/player-avatar.component';
import { WaitingTableComponent, WaitingSeat } from '../../components/waiting-table/waiting-table.component';

export interface Card {
  suit: 'oro' | 'copa' | 'basto' | 'espada';
  value: number;
  points: number;
}

export interface PlayerState {
  id: number;
  username: string;
  cardCount: number;
  score: number;
}

export interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: PlayerState[];
  currentTurn: number;
  discardTop: Card | null;
  deckCount: number;
  round: number;
  bet: number;
  pointLimit: number;
}

@Component({
  selector: 'app-game',
  imports: [CardComponent, PlayerAvatarComponent, DecimalPipe, WaitingTableComponent],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebsocketService);
  private toast = inject(ToastService);
  private audio = inject(AudioService);
  auth = inject(AuthService);
  private game = inject(GameService);

  tableId = '';
  maxPlayers = signal(4);

  // Estado de la partida
  gameState = signal<GameState | null>(null);
  myHand = signal<Card[]>([]);
  selectedCardIndex = signal<number | null>(null);
  hasDrawn = signal(false);
  newCardIndex = signal<number | null>(null);   // índice de la carta recién robada (animación)
  muted = signal(false);

  // Overlay modales
  roundEndData = signal<{ type: string; winnerId: number; scores: Record<string, number> } | null>(null);
  gameOverData = signal<{ winner: number; scores: Record<string, number> } | null>(null);
  showLeaveConfirm = signal(false);

  waitingMessage = signal('Esperando jugadores...');

  waitingSeats = computed((): WaitingSeat[] => {
    const players = this.gameState()?.players ?? [];
    const total   = this.maxPlayers();
    const myId    = this.myId;
    const filled: WaitingSeat[] = players.map(p => ({
      username: p.username,
      avatar: '🃏',
      isMe: p.id === myId,
      isEmpty: false,
    }));
    const empty: WaitingSeat[] = Array.from({ length: total - filled.length }, () => ({
      username: '',
      avatar: '',
      isMe: false,
      isEmpty: true,
    }));
    return [...filled, ...empty];
  });

  private sub!: Subscription;

  get myId(): number {
    return this.auth.currentUser()?.id ?? 0;
  }

  isMyTurn   = computed(() => this.gameState()?.currentTurn === this.myId);
  opponents  = computed(() => (this.gameState()?.players ?? []).filter(p => p.id !== this.myId));
  myScore    = computed(() => this.gameState()?.players.find(p => p.id === this.myId)?.score ?? 0);
  canDraw    = computed(() => this.isMyTurn() && !this.hasDrawn());
  canDiscard = computed(() => this.isMyTurn() && this.hasDrawn() && this.selectedCardIndex() !== null);
  canDeclare = computed(() => this.isMyTurn() && this.hasDrawn());
  iWon       = computed(() => this.gameOverData()?.winner === this.myId);

  roundEndWinnerName = computed(() => {
    const d = this.roundEndData();
    return d ? this.getPlayerName(d.winnerId) : '';
  });

  gameOverWinnerName = computed(() => {
    const d = this.gameOverData();
    return d ? this.getPlayerName(d.winner) : '';
  });

  ngOnInit() {
    this.tableId = this.route.snapshot.paramMap.get('id') ?? '';
    this.game.getTable(this.tableId).subscribe({
      next: t => this.maxPlayers.set(t.maxPlayers),
    });
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe(msg => this.handleMessage(msg));
    this.ws.send('join-table', { tableId: this.tableId });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ws.disconnect();
  }

  private handleMessage({ event, data }: { event: string; data: any }) {
    switch (event) {
      case 'game-state':
        this.gameState.set(data);
        break;

      case 'game-start':
        this.gameState.set(data);
        this.myHand.set(data.hand ?? []);
        this.hasDrawn.set(false);
        this.selectedCardIndex.set(null);
        this.toast.info('¡La partida comenzó!');
        break;

      case 'new-round':
        this.gameState.set(data);
        this.myHand.set(data.hand ?? []);
        this.hasDrawn.set(false);
        this.selectedCardIndex.set(null);
        this.roundEndData.set(null);
        this.toast.info(`Ronda ${data.round} — ¡Adelante!`);
        break;

      case 'your-turn':
        this.hasDrawn.set(false);
        this.selectedCardIndex.set(null);
        this.audio.yourTurn();
        this.toast.info('Es tu turno');
        break;

      case 'card-drawn':
        if (data.card) {
          // Carta propia: viene con la carta real
          this.myHand.update(h => [...h, data.card]);
          this.newCardIndex.set(this.myHand().length - 1);
          setTimeout(() => this.newCardIndex.set(null), 350);
          this.hasDrawn.set(true);
          this.audio.draw();
        }
        break;

      case 'card-discarded':
        if (data.playerId === this.myId) {
          const idx = this.selectedCardIndex();
          if (idx !== null) {
            this.myHand.update(h => h.filter((_, i) => i !== idx));
            this.selectedCardIndex.set(null);
            this.hasDrawn.set(false);
          }
          this.audio.discard();
        }
        this.gameState.update(s => s ? { ...s, discardTop: data.card } : s);
        break;

      case 'round-end':
        this.roundEndData.set(data);
        if (data.type === 'chinchon') {
          this.audio.chinchon();
        }
        break;

      case 'game-over':
        this.gameOverData.set(data);
        if (data.winner === this.myId) {
          this.audio.win();
        } else {
          this.audio.lose();
        }
        break;

      case 'player-joined':
        this.waitingMessage.set(`${data.username} se unió. Esperando más jugadores...`);
        this.audio.join();
        if (data.id) {
          this.gameState.update(s => {
            if (!s) return s;
            if (s.players.some(p => p.id === data.id)) return s;
            return { ...s, players: [...s.players, { id: data.id, username: data.username, cardCount: 0, score: 0 }] };
          });
        }
        break;

      case 'player-disconnected':
        this.toast.warning(`${data.username ?? 'Un jugador'} se desconectó.`);
        break;

      case 'error':
        this.toast.error(data.message);
        break;
    }
  }

  drawFromDeck() {
    if (!this.canDraw()) return;
    this.ws.send('draw-card', { tableId: this.tableId, source: 'deck' });
  }

  drawFromDiscard() {
    if (!this.canDraw() || !this.gameState()?.discardTop) return;
    this.ws.send('draw-card', { tableId: this.tableId, source: 'discard' });
  }

  selectCard(index: number) {
    if (!this.hasDrawn()) return;
    this.selectedCardIndex.update(cur => cur === index ? null : index);
  }

  discard() {
    const idx = this.selectedCardIndex();
    if (!this.canDiscard() || idx === null) return;
    this.ws.send('discard-card', { tableId: this.tableId, cardIndex: idx });
  }

  declareChinchon() {
    if (!this.canDeclare()) return;
    this.ws.send('declare-chinchon', { tableId: this.tableId });
  }

  cut() {
    if (!this.canDeclare()) return;
    this.ws.send('cut', { tableId: this.tableId });
  }

  getPlayerName(id: number): string {
    return this.gameState()?.players.find(p => p.id === id)?.username ?? 'Desconocido';
  }

  confirmLeave() {
    this.showLeaveConfirm.set(true);
  }

  cancelLeave() {
    this.showLeaveConfirm.set(false);
  }

  leaveGame() {
    this.router.navigate(['/tables']);
  }

  continueAfterRound() {
    this.roundEndData.set(null);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  toggleMute() {
    this.muted.set(this.audio.toggleMute());
  }
}
