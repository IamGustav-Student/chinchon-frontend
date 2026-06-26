import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface TableSummary {
  id: string;
  creator: string;
  bet: number;
  maxPlayers: number;
  players: number;
  status: 'waiting' | 'playing' | 'finished';
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly API = `${environment.apiUrl}/game`;

  constructor(private http: HttpClient) {}

  listTables() {
    return this.http.get<TableSummary[]>(`${this.API}/list`);
  }

  createTable(bet: number, maxPlayers: number, pointLimit: number) {
    return this.http.post<TableSummary>(`${this.API}/create`, { bet, maxPlayers, pointLimit });
  }

  joinTable(id: string) {
    return this.http.post<TableSummary>(`${this.API}/join/${id}`, {});
  }

  getTable(id: string) {
    return this.http.get<TableSummary>(`${this.API}/${id}`);
  }
}
