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

  // Orbit radii as percentage of scene (50% = center, measured from center outward)
  // Oval is 60% wide (±30% from center) and 52% tall (±26% from center)
  // Seats orbit at 42%/40% so they clear the oval edge
  private readonly RX_PCT = 42;
  private readonly RY_PCT = 40;

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

  // Returns positions as percentages so the layout scales with the scene CSS size
  seatsWithPos(): (WaitingSeat & { xPct: number; yPct: number })[] {
    const total = this.totalSeats;
    if (!total) return [];
    return this.seats.map((seat, i) => {
      // Start at 90° (bottom = me) and go clockwise
      const deg = (90 + (360 / total) * i) % 360;
      const rad = deg * Math.PI / 180;
      return {
        ...seat,
        xPct: 50 + this.RX_PCT * Math.cos(rad),
        yPct: 50 + this.RY_PCT * Math.sin(rad),
      };
    });
  }
}
