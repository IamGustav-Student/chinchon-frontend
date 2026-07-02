import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  activeTables: number;
  pendingDeposits: number;
  weeklyRevenue: number;
  totalBalance: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  avatar: string;
  balance: number;
  role: 'user' | 'admin';
  banned: boolean;
  createdAt: string;
  gamesPlayed: number;
  gamesWon: number;
}

export interface AdminDeposit {
  id: number;
  userId: number;
  username: string;
  amount: number;
  senderName: string;
  senderBank: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AdminTable {
  id: string;
  game: 'chinchon' | 'holdem' | 'truco';
  status: 'waiting' | 'playing';
  playerCount: number;
  maxPlayers: number;
  buyIn: number;
  createdAt: string;
}

export interface AdminTournament {
  id: string;
  status: string;
  registeredCount: number;
  minPlayers: number;
  prizePool: number;
  startsAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  getStats()    { return this.http.get<AdminStats>(`${this.base}/stats`); }

  getUsers(search = '', page = 1) {
    return this.http.get<{ users: AdminUser[]; total: number }>(`${this.base}/users`, {
      params: { search, page: page.toString() },
    });
  }

  banUser(id: number)    { return this.http.post(`${this.base}/users/${id}/ban`, {}); }
  unbanUser(id: number)  { return this.http.post(`${this.base}/users/${id}/unban`, {}); }
  editBalance(id: number, balance: number) {
    return this.http.put(`${this.base}/users/${id}/balance`, { balance });
  }
  setRole(id: number, role: 'user' | 'admin') {
    return this.http.put(`${this.base}/users/${id}/role`, { role });
  }

  getDeposits(status = 'pending') {
    return this.http.get<AdminDeposit[]>(`${this.base}/deposits`, { params: { status } });
  }
  approveDeposit(id: number) { return this.http.post(`${this.base}/deposits/${id}/approve`, {}); }
  rejectDeposit(id: number)  { return this.http.post(`${this.base}/deposits/${id}/reject`, {}); }

  getTables()      { return this.http.get<AdminTable[]>(`${this.base}/tables`); }
  closeTable(id: string) { return this.http.delete(`${this.base}/tables/${id}`); }

  getTournament()          { return this.http.get<AdminTournament>(`${this.base}/tournament`); }
  startTournament()        { return this.http.post(`${this.base}/tournament/start`, {}); }
  cancelTournament()       { return this.http.post(`${this.base}/tournament/cancel`, {}); }
}
