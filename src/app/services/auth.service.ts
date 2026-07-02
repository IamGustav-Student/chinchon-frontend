import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string;
  balance: number;
  bio?: string;
  role?: 'user' | 'admin';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient) {}

  register(username: string, email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.API}/register`, { username, email, password }).pipe(
      tap(res => this.setSession(res.token, res.user))
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${this.API}/login`, { email, password }).pipe(
      tap(res => this.setSession(res.token, res.user))
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  private setSession(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
  }

  private loadUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
