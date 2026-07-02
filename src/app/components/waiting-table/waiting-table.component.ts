import { Component, Input } from '@angular/core';

export interface WaitingSeat {
  username: string;
  avatar: string;
  isMe: boolean;
  isEmpty: boolean;
  sub?: string;
}

@Component({
  selector: 'app-waiting-table',
  templateUrl: './waiting-table.component.html',
  styleUrl: './waiting-table.component.scss',
})
export class WaitingTableComponent {
  @Input() seats: WaitingSeat[] = [];
  @Input() gameName = '';

  get seatedCount(): number {
    return this.seats.filter(s => !s.isEmpty).length;
  }

  get totalSeats(): number {
    return this.seats.length;
  }

  get progressDash(): string {
    const r = 22;
    const circ = 2 * Math.PI * r;
    const pct = this.totalSeats > 0 ? this.seatedCount / this.totalSeats : 0;
    return `${circ * pct} ${circ}`;
  }

  // n=2 → left=1 right=1 | n=3 → left=1 right=2 | n=4 → left=2 right=2
  get leftSeats(): WaitingSeat[] {
    const half = Math.floor(this.seats.length / 2) || 1;
    return this.seats.slice(0, half);
  }

  get rightSeats(): WaitingSeat[] {
    const half = Math.floor(this.seats.length / 2) || 1;
    return this.seats.slice(half);
  }

  isDataUrl(avatar: string): boolean {
    return avatar.startsWith('data:');
  }
}
