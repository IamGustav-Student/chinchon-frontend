import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface RankingEntry {
  id: number;
  username: string;
  avatar: string;
  points: number;
  earnings: number;
}

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly API = `${environment.apiUrl}/ranking`;

  constructor(private http: HttpClient) {}

  getWeekly() {
    return this.http.get<{ ranking: RankingEntry[]; nextReset: string }>(`${this.API}/weekly`);
  }

  getAllTime() {
    return this.http.get<RankingEntry[]>(`${this.API}/all-time`);
  }
}
