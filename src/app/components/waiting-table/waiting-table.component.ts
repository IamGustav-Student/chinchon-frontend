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

  // Scene dimensions (px) — must match SCSS .table-scene width/height
  private readonly W = 360;
  private readonly H = 260;

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

  get circumference(): number {
    return 2 * Math.PI * 22;
  }

  seatsWithPos(): (WaitingSeat & { x: number; y: number })[] {
    const total = this.totalSeats;
    if (!total) return [];
    const cx = this.W / 2;
    const cy = this.H / 2;
    const rx = cx - 52;
    const ry = cy - 38;
    return this.seats.map((seat, i) => {
      const deg = (270 + (360 / total) * i) % 360;
      const rad = deg * Math.PI / 180;
      return {
        ...seat,
        x: cx + rx * Math.cos(rad),
        y: cy + ry * Math.sin(rad),
      };
    });
  }
}
