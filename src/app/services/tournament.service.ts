import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type TournamentStatus = 'upcoming' | 'registration_open' | 'in_progress' | 'finished' | 'cancelled';

export interface TournamentInfo {
  id: string;
  status: TournamentStatus;
  startsAt: string;
  registrationDeadline: string;
  entryFee: number;
  registeredCount: number;
  minPlayers: number;
  isRegistered: boolean;
  prizePool: number;
  winnerPrize: number;
  finalistPrize: number;
  registeredPlayers?: { id: number; username: string; avatar: string }[];
}

export interface BracketMatch {
  matchId: string;
  round: number;
  tableId: string | null;
  players: { id: number; username: string; avatar: string }[];
  winnerId: number | null;
  status: 'pending' | 'playing' | 'finished';
}

export interface TournamentBracket {
  tournamentId: string;
  currentRound: number;
  totalRounds: number;
  matches: BracketMatch[];
  myMatchId: string | null;
}

export interface TournamentResult {
  tournamentId: string;
  winnerId: number;
  winnerUsername: string;
  finalistId: number;
  finalistUsername: string;
  prizePool: number;
  winnerPrize: number;
  finalistPrize: number;
  totalPlayers: number;
}

@Injectable({ providedIn: 'root' })
export class TournamentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tournament`;

  getCurrent()    { return this.http.get<TournamentInfo>(`${this.base}/current`); }
  register()      { return this.http.post<{ ok: boolean }>(`${this.base}/register`, {}); }
  unregister()    { return this.http.delete<{ ok: boolean }>(`${this.base}/register`); }
  getBracket(id: string) { return this.http.get<TournamentBracket>(`${this.base}/${id}/bracket`); }
  getResult(id: string)  { return this.http.get<TournamentResult>(`${this.base}/${id}/result`); }
}
