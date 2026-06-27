import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type TrucoSuit = 'oro' | 'copa' | 'basto' | 'espada';
export type ChallengeType =
  'envido' | 'envido-envido' | 'real-envido' | 'falta-envido' |
  'truco' | 'retruco' | 'vale-cuatro';

export interface TrucoCard {
  suit: TrucoSuit;
  value: number;
  played: boolean;
}

export interface TrucoPlayerState {
  id: number;
  username: string;
  avatar: string;
  teamIndex: 0 | 1;
  seatIndex: number;
  isMano: boolean;
  cardCount: number;
  cardPlayed: TrucoCard | null;
  lastAction: string | null;
}

export interface TrucoChallenge {
  type: ChallengeType;
  callerId: number;
  callerTeam: 0 | 1;
  pointsIfAccepted: number;
  pointsIfRejected: number;
}

export interface TrucoTrick {
  plays: { playerId: number; card: TrucoCard }[];
  winnerTeam: 0 | 1 | null;
}

export interface TrucoHandResult {
  winnerTeam: 0 | 1;
  trucoPoints: number;
  envidoPoints: number;
  details: string;
  teamScores: [number, number];
}

export interface TrucoGameState {
  tableId: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: 2 | 4;
  buyIn: number;
  pointLimit: number;
  players: TrucoPlayerState[];
  myCards: TrucoCard[];
  teamScores: [number, number];
  currentTurnId: number | null;
  envidoOpen: boolean;
  challenge: TrucoChallenge | null;
  tricks: TrucoTrick[];
  currentTrickPlays: { playerId: number; card: TrucoCard }[];
}

export interface TrucoTableSummary {
  id: string;
  buyIn: number;
  maxPlayers: 2 | 4;
  playerCount: number;
  status: 'waiting' | 'playing';
  pointLimit: number;
}

@Injectable({ providedIn: 'root' })
export class TrucoService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/truco`;

  listTables() {
    return this.http.get<TrucoTableSummary[]>(`${this.base}/list`);
  }

  createTable(buyIn: number, maxPlayers: 2 | 4, pointLimit: number) {
    return this.http.post<TrucoTableSummary>(`${this.base}/create`, { buyIn, maxPlayers, pointLimit });
  }

  joinTable(id: string) {
    return this.http.post<{ tableId: string }>(`${this.base}/join/${id}`, {});
  }
}
