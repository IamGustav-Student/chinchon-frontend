import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminService, AdminStats, AdminUser, AdminDeposit, AdminTable, AdminTournament,
} from '../../services/admin.service';
import { ToastService } from '../../services/toast.service';

type Tab = 'stats' | 'users' | 'deposits' | 'tables' | 'tournament';

@Component({
  selector: 'app-admin',
  imports: [DecimalPipe, DatePipe, SlicePipe, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private svc   = inject(AdminService);
  private toast = inject(ToastService);

  activeTab = signal<Tab>('stats');

  // Stats
  stats    = signal<AdminStats | null>(null);
  statsLoading = signal(true);

  // Users
  users        = signal<AdminUser[]>([]);
  usersTotal   = signal(0);
  usersLoading = signal(false);
  usersPage    = signal(1);
  userSearch   = '';
  editingBalance: { id: number; value: number } | null = null;
  confirmAction: { type: string; userId: number; username: string } | null = null;

  // Deposits
  deposits        = signal<AdminDeposit[]>([]);
  depositsFilter  = signal<'pending' | 'approved' | 'rejected'>('pending');
  depositsLoading = signal(false);

  // Tables
  tables        = signal<AdminTable[]>([]);
  tablesLoading = signal(false);

  // Tournament
  tournament        = signal<AdminTournament | null>(null);
  tournamentLoading = signal(false);
  confirmTournamentAction: 'start' | 'cancel' | null = null;

  ngOnInit() { this.loadStats(); }

  setTab(t: Tab) {
    this.activeTab.set(t);
    if (t === 'stats'      && !this.stats())          this.loadStats();
    if (t === 'users'      && !this.users().length)   this.loadUsers();
    if (t === 'deposits'   && !this.deposits().length) this.loadDeposits();
    if (t === 'tables'     && !this.tables().length)  this.loadTables();
    if (t === 'tournament' && !this.tournament())     this.loadTournament();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  loadStats() {
    this.statsLoading.set(true);
    this.svc.getStats().subscribe({
      next: s => { this.stats.set(s); this.statsLoading.set(false); },
      error: () => this.statsLoading.set(false),
    });
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  loadUsers() {
    this.usersLoading.set(true);
    this.svc.getUsers(this.userSearch, this.usersPage()).subscribe({
      next: ({ users, total }) => {
        this.users.set(users);
        this.usersTotal.set(total);
        this.usersLoading.set(false);
      },
      error: () => this.usersLoading.set(false),
    });
  }

  searchUsers() {
    this.usersPage.set(1);
    this.loadUsers();
  }

  nextPage()  { this.usersPage.update(p => p + 1); this.loadUsers(); }
  prevPage()  { this.usersPage.update(p => Math.max(1, p - 1)); this.loadUsers(); }
  totalPages() { return Math.ceil(this.usersTotal() / 20); }

  askBan(u: AdminUser) {
    this.confirmAction = { type: u.banned ? 'unban' : 'ban', userId: u.id, username: u.username };
  }

  confirmBan() {
    if (!this.confirmAction) return;
    const { type, userId } = this.confirmAction;
    const req = type === 'ban' ? this.svc.banUser(userId) : this.svc.unbanUser(userId);
    req.subscribe({
      next: () => {
        this.toast.success(type === 'ban' ? 'Usuario baneado.' : 'Ban levantado.');
        this.confirmAction = null;
        this.loadUsers();
      },
      error: () => this.toast.error('Error al cambiar estado del usuario.'),
    });
  }

  startEditBalance(u: AdminUser) {
    this.editingBalance = { id: u.id, value: u.balance };
  }

  saveBalance() {
    if (!this.editingBalance) return;
    this.svc.editBalance(this.editingBalance.id, this.editingBalance.value).subscribe({
      next: () => {
        this.toast.success('Saldo actualizado.');
        this.editingBalance = null;
        this.loadUsers();
      },
      error: () => this.toast.error('Error al actualizar saldo.'),
    });
  }

  toggleRole(u: AdminUser) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    this.svc.setRole(u.id, newRole).subscribe({
      next: () => {
        this.toast.success(`Rol cambiado a ${newRole}.`);
        this.loadUsers();
      },
      error: () => this.toast.error('Error al cambiar rol.'),
    });
  }

  // ── Deposits ──────────────────────────────────────────────────────────────

  loadDeposits() {
    this.depositsLoading.set(true);
    this.svc.getDeposits(this.depositsFilter()).subscribe({
      next: d => { this.deposits.set(d); this.depositsLoading.set(false); },
      error: () => this.depositsLoading.set(false),
    });
  }

  setDepositFilter(f: 'pending' | 'approved' | 'rejected') {
    this.depositsFilter.set(f);
    this.loadDeposits();
  }

  approveDeposit(d: AdminDeposit) {
    this.svc.approveDeposit(d.id).subscribe({
      next: () => { this.toast.success(`Depósito de $${d.amount} aprobado.`); this.loadDeposits(); },
      error: () => this.toast.error('Error al aprobar depósito.'),
    });
  }

  rejectDeposit(d: AdminDeposit) {
    this.svc.rejectDeposit(d.id).subscribe({
      next: () => { this.toast.success('Depósito rechazado.'); this.loadDeposits(); },
      error: () => this.toast.error('Error al rechazar depósito.'),
    });
  }

  // ── Tables ────────────────────────────────────────────────────────────────

  loadTables() {
    this.tablesLoading.set(true);
    this.svc.getTables().subscribe({
      next: t => { this.tables.set(t); this.tablesLoading.set(false); },
      error: () => this.tablesLoading.set(false),
    });
  }

  closeTable(t: AdminTable) {
    this.svc.closeTable(t.id).subscribe({
      next: () => { this.toast.success('Mesa cerrada.'); this.loadTables(); },
      error: () => this.toast.error('Error al cerrar mesa.'),
    });
  }

  gameLabel(g: string): string {
    return { chinchon: 'Chinchón', holdem: "Hold'em", truco: 'Truco' }[g] ?? g;
  }

  // ── Tournament ────────────────────────────────────────────────────────────

  loadTournament() {
    this.tournamentLoading.set(true);
    this.svc.getTournament().subscribe({
      next: t => { this.tournament.set(t); this.tournamentLoading.set(false); },
      error: () => this.tournamentLoading.set(false),
    });
  }

  askTournamentAction(a: 'start' | 'cancel') {
    this.confirmTournamentAction = a;
  }

  confirmTournament() {
    const action = this.confirmTournamentAction;
    if (!action) return;
    const req = action === 'start' ? this.svc.startTournament() : this.svc.cancelTournament();
    req.subscribe({
      next: () => {
        const msg = action === 'start' ? 'Torneo iniciado.' : 'Torneo cancelado.';
        this.toast.success(msg);
        this.confirmTournamentAction = null;
        this.loadTournament();
      },
      error: () => this.toast.error('Error al ejecutar acción de torneo.'),
    });
  }

  winRate(u: AdminUser): string {
    if (!u.gamesPlayed) return '—';
    return Math.round((u.gamesWon / u.gamesPlayed) * 100) + '%';
  }
}
