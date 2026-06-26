import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { GameService } from '../../services/game.service';
import { CardComponent } from '../../components/card/card.component';
import { PlayerAvatarComponent } from '../../components/player-avatar/player-avatar.component';

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
  imports: [CardComponent, PlayerAvatarComponent, DecimalPipe],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ws = inject(WebsocketService);
  auth = inject(AuthService);
  private game = inject(GameService);

  tableId = '';

  // Estado de la partida
  gameState = signal<GameState | null>(null);
  myHand = signal<Card[]>([]);
  selectedCardIndex = signal<number | null>(null);
  hasDrawn = signal(false);

  // Overlays
  roundEndData = signal<{ type: string; winnerId: number; scores: Record<string, number> } | null>(null);
  gameOverData = signal<{ winner: number; scores: Record<string, number> } | null>(null);

  // UI state
  waitingMessage = signal('Esperando jugadores...');
  errorMessage = signal('');
  spectator = signal(false);

  private sub!: Subscription;

  get myId(): number {
    return this.auth.currentUser()?.id ?? 0;
  }

  isMyTurn = computed(() => this.gameState()?.currentTurn === this.myId);

  opponents = computed(() =>
    (this.gameState()?.players ?? []).filter(p => p.id !== this.myId)
  );

  myScore = computed(() =>
    this.gameState()?.players.find(p => p.id === this.myId)?.score ?? 0
  );

  canDraw = computed(() => this.isMyTurn() && !this.hasDrawn());
  canDiscard = computed(() => this.isMyTurn() && this.hasDrawn() && this.selectedCardIndex() !== null);
  canDeclare = computed(() => this.isMyTurn() && this.hasDrawn());

  ngOnInit() {
    this.tableId = this.route.snapshot.paramMap.get('id') ?? '';
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
        break;

      case 'new-round':
        this.gameState.set(data);
        this.myHand.set(data.hand ?? []);
        this.hasDrawn.set(false);
        this.selectedCardIndex.set(null);
        this.roundEndData.set(null);
        break;

      case 'your-turn':
        this.hasDrawn.set(false);
        this.selectedCardIndex.set(null);
        break;

      case 'card-drawn':
        if (data.card) {
          // Carta propia — viene con la carta real
          this.myHand.update(h => [...h, data.card]);
          this.hasDrawn.set(true);
        }
        // Si es de otro jugador, el estado se actualiza vía game-state
        break;

      case 'card-discarded':
        // El estado del descarte lo sincronizamos con game-state
        // pero actualizamos la visualización local
        if (data.playerId === this.myId) {
          const idx = this.selectedCardIndex();
          if (idx !== null) {
            this.myHand.update(h => h.filter((_, i) => i !== idx));
            this.selectedCardIndex.set(null);
            this.hasDrawn.set(false);
          }
        }
        // Actualizar la carta en el descarte en el estado
        this.gameState.update(s => s ? { ...s, discardTop: data.card } : s);
        break;

      case 'round-end':
        this.roundEndData.set(data);
        break;

      case 'game-over':
        this.gameOverData.set(data);
        break;

      case 'player-joined':
        this.waitingMessage.set(`${data.username} se unió. Esperando más jugadores...`);
        break;

      case 'player-disconnected':
        this.errorMessage.set(`${data.username ?? 'Un jugador'} se desconectó.`);
        break;

      case 'error':
        this.errorMessage.set(data.message);
        setTimeout(() => this.errorMessage.set(''), 3000);
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

  leaveGame() {
    this.router.navigate(['/tables']);
  }

  continueAfterRound() {
    this.roundEndData.set(null);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  roundEndWinnerName = computed(() => {
    const d = this.roundEndData();
    if (!d) return '';
    return this.getPlayerName(d.winnerId);
  });

  gameOverWinnerName = computed(() => {
    const d = this.gameOverData();
    if (!d) return '';
    return this.getPlayerName(d.winner);
  });

  iWon = computed(() => this.gameOverData()?.winner === this.myId);
}
