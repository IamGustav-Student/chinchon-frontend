import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'tables',
    loadComponent: () => import('./pages/tables/tables.component').then(m => m.TablesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'ranking',
    loadComponent: () => import('./pages/ranking/ranking.component').then(m => m.RankingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'rules',
    loadComponent: () => import('./pages/rules/rules.component').then(m => m.RulesComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/game/game.component').then(m => m.GameComponent),
    canActivate: [authGuard],
  },
  {
    path: 'holdem',
    loadComponent: () => import('./pages/holdem/holdem.component').then(m => m.HoldemComponent),
    canActivate: [authGuard],
  },
  {
    path: 'holdem/:id',
    loadComponent: () => import('./pages/holdem-game/holdem-game.component').then(m => m.HoldemGameComponent),
    canActivate: [authGuard],
  },
  {
    path: 'tournament',
    loadComponent: () => import('./pages/tournament/tournament.component').then(m => m.TournamentComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/dashboard' },
];
