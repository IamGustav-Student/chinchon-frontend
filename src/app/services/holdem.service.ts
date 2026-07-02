import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface HoldemTableSummary {
  id: string;
  buyIn: number;
  blindsSmall: number;
  blindsBig: number;
  maxPlayers: number;
  playerCount: number;
  status: 'waiting' | 'playing';
  maxRebuys: number;
}

export interface HoldemTableDetail extends HoldemTableSummary {
  players: { id: number; username: string; avatar: string; stack: number }[];
}

@Injectable({ providedIn: 'root' })
export class HoldemService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/holdem`;

  listTables()  { return this.http.get<HoldemTableSummary[]>(`${this.base}/list`); }
  getTable(id: string) { return this.http.get<HoldemTableDetail>(`${this.base}/${id}`); }

  createTable(buyIn: number, maxPlayers: number) {
    return this.http.post<HoldemTableDetail>(`${this.base}/create`, { buyIn, maxPlayers });
  }

  joinTable(id: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/join/${id}`, {});
  }

  rebuy(id: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/${id}/rebuy`, {});
  }

  leaveTable(id: string) {
    return this.http.post(`${this.base}/leave/${id}`, {});
  }
}
