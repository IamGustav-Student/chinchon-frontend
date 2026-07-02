import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface WalletMovement {
  type: 'deposit' | 'withdraw' | 'game-win' | 'game-loss';
  amount: number;
  created_at: string;
}

export interface DepositInfo {
  alias: string;
  code: string;
  instructions: string;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly API = `${environment.apiUrl}/wallet`;

  constructor(private http: HttpClient) {}

  getBalance() {
    return this.http.get<{ balance: number }>(`${this.API}/balance`);
  }

  getDepositInfo() {
    return this.http.get<DepositInfo>(`${this.API}/deposit-info`);
  }

  deposit(amount: number, senderName: string, senderBank: string, transactionId: string) {
    return this.http.post<{ balance: number }>(`${this.API}/deposit`, {
      amount, senderName, senderBank, transactionId,
    });
  }

  withdraw(amount: number) {
    return this.http.post<{ balance: number }>(`${this.API}/withdraw`, { amount });
  }

  getHistory() {
    return this.http.get<WalletMovement[]>(`${this.API}/history`);
  }
}
