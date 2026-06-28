import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { WebsocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { AudioService } from '../../services/audio.service';
import { CardComponent } from '../../components/card/card.component';
import { PlayerMenuComponent, PlayerMenuTarget } from '../../components/player-menu/player-menu.component';
import { WsMessage } from '../../services/websocket.service';
import {
  TrucoGameState, TrucoCard, TrucoPlayerState, TrucoHandResult, TrucoTrick,
} from '../../services/truco.service';

export interface PartnerSignal { id: string; label: string; }

const CHALLENGE_LABELS: Record<string, string> = {
  'envido': 'Envido',
  'envido-envido': 'Envido Envido',
  'real-envido': 'Real Envido',
  'falta-envido': 'Falta Envido',
  'truco': 'Truco',
  'retruco': 'Retruco',
  'vale-cuatro': 'Vale Cuatro',
};

const PARTNER_SIGNAL_LABELS: Record<string, string> = {
  'tengo-envido':  'Tengo envido',
  'falta-envido':  'Falta envido',
  'sin-envido':    'Sin envido',
  'buenas':        'Buenas',
  'malas':         'Malas',
  'voy':           'Voy',
  'pongo':         'Pongo',
  'truco':         'Truco',
  'quiero':        'Quiero',
  'no':            'No',
};

@Component({
  selector: 'app-truco-game',
  imports: [CardComponent, PlayerMenuComponent],
  templateUrl: './truco-game.component.html',
  styleUrl: './truco-game.component.scss',
})
export class TrucoGameComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private ws     = inject(WebsocketService);
  private toast  = inject(ToastService);
  private audio  = inject(AudioService);
  auth           = inject(AuthService);

  private sub!: Subscription;
  private tableId = '';

  gameState         = signal<TrucoGameState | null>(null);
  handResult        = signal<TrucoHandResult | null>(null);
  partnerSignalMsg  = signal<string | null>(null);
  selectedCard      = signal<number | null>(null);
  muted             = signal(false);
  showLeaveConfirm  = signal(false);
  menuTarget        = signal<PlayerMenuTarget | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────

  myId = computed(() => this.auth.currentUser()?.id ?? 0);

  me = computed((): TrucoPlayerState | null => {
    return this.gameState()?.players.find(p => p.id === this.myId()) ?? null;
  });

  myTeam = computed(() => this.me()?.teamIndex ?? 0);

  partner = computed((): TrucoPlayerState | null => {
    const gs = this.gameState();
    const me = this.me();
    if (!gs || !me || gs.maxPlayers !== 4) return null;
    return gs.players.find(p => p.teamIndex === me.teamIndex && p.id !== me.id) ?? null;
  });

  opponents = computed((): TrucoPlayerState[] => {
    const gs = this.gameState();
    const me = this.me();
    if (!gs || !me) return [];
    return gs.players.filter(p => p.teamIndex !== me.teamIndex);
  });

  isMyTurn = computed(() => this.gameState()?.currentTurnId === this.myId());

  // Puedo jugar carta: es mi turno y no hay desafío activo
  canPlayCard = computed(() =>
    this.isMyTurn() && !this.gameState()?.challenge
  );

  // Puedo responder un desafío: hay un desafío y no lo inicié yo (ni mi equipo)
  canRespond = computed(() => {
    const gs = this.gameState();
    if (!gs?.challenge) return false;
    return gs.challenge.callerTeam !== this.myTeam();
  });

  canCallEnvido = computed(() => {
    const gs = this.gameState();
    return !!gs?.envidoOpen && this.isMyTurn() && !gs.challenge;
  });

  canCallRealEnvido = computed(() => {
    const gs = this.gameState();
    return this.canRespond() &&
      (gs?.challenge?.type === 'envido' || gs?.challenge?.type === 'envido-envido');
  });

  canCallFaltaEnvido = computed(() => {
    const gs = this.gameState();
    return this.canRespond() &&
      (gs?.challenge?.type === 'envido' ||
       gs?.challenge?.type === 'envido-envido' ||
       gs?.challenge?.type === 'real-envido');
  });

  canCallEnvidoEnvido = computed(() => {
    const gs = this.gameState();
    return this.canRespond() && gs?.challenge?.type === 'envido';
  });

  canCallTruco = computed(() => {
    const gs = this.gameState();
    if (!gs || gs.challenge) return false;
    return this.isMyTurn();
  });

  canCallRetruco = computed(() =>
    this.canRespond() && this.gameState()?.challenge?.type === 'truco'
  );

  canCallValeCuatro = computed(() =>
    this.canRespond() && this.gameState()?.challenge?.type === 'retruco'
  );

  canQuiero = computed(() => this.canRespond());
  canNoQuiero = computed(() => this.canRespond());

  canIrseAlMazo = computed(() =>
    this.isMyTurn() && this.gameState()?.status === 'playing'
  );

  challengeLabel = computed((): string => {
    const ch = this.gameState()?.challenge;
    if (!ch) return '';
    const who = this.getPlayerById(ch.callerId)?.username ?? 'Alguien';
    return `${who} cantó ${CHALLENGE_LABELS[ch.type] ?? ch.type}`;
  });

  // Señas al compañero — cambian según la fase
  partnerSignals = computed((): PartnerSignal[] => {
    const gs = this.gameState();
    if (!gs || gs.maxPlayers !== 4 || gs.status !== 'playing') return [];

    const ch = gs.challenge;
    const isTrucoChallenge = ch && ['truco','retruco','vale-cuatro'].includes(ch.type);
    const isEnvidoChallenge = ch && ['envido','envido-envido','real-envido','falta-envido'].includes(ch.type);

    if (gs.envidoOpen && !ch) {
      return [
        { id: 'tengo-envido', label: 'Tengo envido' },
        { id: 'falta-envido', label: 'Falta envido' },
        { id: 'sin-envido',   label: 'Sin envido'   },
        { id: 'voy',          label: 'Voy'           },
      ];
    }
    if (isEnvidoChallenge) {
      return [
        { id: 'quiero', label: 'Quiero'   },
        { id: 'no',     label: 'No'       },
        { id: 'pongo',  label: 'Pongo'    },
        { id: 'voy',    label: 'Voy'      },
      ];
    }
    if (isTrucoChallenge) {
      return [
        { id: 'quiero', label: 'Quiero'   },
        { id: 'no',     label: 'No'       },
        { id: 'pongo',  label: 'Pongo'    },
        { id: 'voy',    label: 'Voy'      },
      ];
    }
    // Fase de juego normal
    return [
      { id: 'buenas', label: 'Buenas' },
      { id: 'malas',  label: 'Malas'  },
      { id: 'truco',  label: 'Truco'  },
      { id: 'pongo',  label: 'Pongo'  },
    ];
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    this.tableId = this.route.snapshot.paramMap.get('id') ?? '';
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe(msg => this.handleMessage(msg));
    this.ws.send('truco-join-table', { tableId: this.tableId });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ── WS handlers ──────────────────────────────────────────────────────────

  private handleMessage(msg: WsMessage) {
    const data = msg.data as any;
    switch (msg.event) {
      case 'truco-game-state':
        this.gameState.set(data);
        this.selectedCard.set(null);
        break;

      case 'truco-your-turn':
        if (!this.muted()) this.audio.yourTurn();
        this.toast.info('¡Es tu turno!');
        break;

      case 'truco-challenge': {
        const label = CHALLENGE_LABELS[data.type] ?? data.type;
        this.toast.warning(`${data.callerUsername} cantó ${label}`);
        if (!this.muted()) this.audio.discard();
        break;
      }

      case 'truco-hand-end': {
        const res: TrucoHandResult = data;
        this.handResult.set(res);
        const won = res.winnerTeam === this.myTeam();
        if (!this.muted()) { won ? this.audio.win() : this.audio.lose(); }
        setTimeout(() => this.handResult.set(null), 5000);
        break;
      }

      case 'truco-partner-signal': {
        const label = PARTNER_SIGNAL_LABELS[data.signal] ?? data.signal;
        this.partnerSignalMsg.set(label);
        setTimeout(() => this.partnerSignalMsg.set(null), 3500);
        break;
      }

      case 'truco-game-over':
        this.gameState.update(gs => gs ? { ...gs, status: 'finished' } : gs);
        break;

      case 'truco-error':
        this.toast.error(data.message ?? 'Error en el juego');
        break;
    }
  }

  // ── Acciones de juego ────────────────────────────────────────────────────

  playCard() {
    const idx = this.selectedCard();
    const cards = this.gameState()?.myCards;
    if (idx === null || !cards) return;
    const card = cards[idx];
    if (!card || card.played) return;
    this.ws.send('truco-play-card', { suit: card.suit, value: card.value });
    this.selectedCard.set(null);
    if (!this.muted()) this.audio.draw();
  }

  selectCard(index: number) {
    if (!this.canPlayCard()) return;
    const card = this.gameState()?.myCards[index];
    if (!card || card.played) return;
    this.selectedCard.set(this.selectedCard() === index ? null : index);
  }

  callEnvido()       { this.ws.send('truco-envido', {}); }
  callEnvidoEnvido() { this.ws.send('truco-envido-envido', {}); }
  callRealEnvido()   { this.ws.send('truco-real-envido', {}); }
  callFaltaEnvido()  { this.ws.send('truco-falta-envido', {}); }
  callTruco()        { this.ws.send('truco-truco', {}); }
  callRetruco()      { this.ws.send('truco-retruco', {}); }
  callValeCuatro()   { this.ws.send('truco-vale-cuatro', {}); }
  quiero()           { this.ws.send('truco-quiero', {}); }
  noQuiero()         { this.ws.send('truco-no-quiero', {}); }
  irseAlMazo()       { this.ws.send('truco-irse-al-mazo', {}); }

  sendPartnerSignal(signalId: string) {
    this.ws.send('truco-partner-signal', { signal: signalId });
  }

  // ── Salir ────────────────────────────────────────────────────────────────

  confirmLeave()  { this.showLeaveConfirm.set(true); }
  cancelLeave()   { this.showLeaveConfirm.set(false); }
  leaveTable()    { this.router.navigate(['/truco']); }
  toggleMute()    { this.muted.set(this.audio.toggleMute()); }

  // ── Helpers (usados en template, no pueden ser arrow functions) ──────────

  getPlayerById(id: number): TrucoPlayerState | null {
    return this.gameState()?.players.find(p => p.id === id) ?? null;
  }

  cardPlayedBy(playerId: number): TrucoCard | null {
    const play = this.gameState()?.currentTrickPlays.find(p => p.playerId === playerId);
    return play?.card ?? null;
  }

  trickWinnerName(trick: TrucoTrick): string {
    if (trick.winnerTeam === null) return 'Empate';
    const meTeam = this.myTeam();
    return trick.winnerTeam === meTeam ? 'Nosotros' : 'Ellos';
  }

  actionLabel(action: string | null): string {
    if (!action) return '';
    const map: Record<string, string> = {
      'envido': 'Envido', 'real-envido': 'Real Envido', 'falta-envido': 'Falta Envido',
      'truco': 'Truco', 'retruco': 'Retruco', 'vale-cuatro': 'Vale Cuatro',
      'quiero': '¡Quiero!', 'no-quiero': 'No quiero', 'irse-al-mazo': 'Me fui',
    };
    return map[action] ?? action;
  }

  trackByIndex(index: number): number { return index; }

  openPlayerMenu(p: TrucoPlayerState) {
    this.menuTarget.set({ id: p.id, username: p.username, avatar: p.avatar });
  }

  closePlayerMenu() { this.menuTarget.set(null); }
}
