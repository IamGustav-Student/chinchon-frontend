import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RankingEntry } from '../../services/ranking.service';

@Component({
  selector: 'app-ranking-podium',
  imports: [DecimalPipe],
  templateUrl: './ranking-podium.component.html',
  styleUrl: './ranking-podium.component.scss',
})
export class RankingPodiumComponent {
  @Input() top3: RankingEntry[] = [];

  readonly PRIZES = [280000, 230000, 180000];
  readonly MEDALS = ['🥇', '🥈', '🥉'];
  // Orden visual: 2°, 1°, 3°
  readonly ORDER = [1, 0, 2];

  isCustomImage(avatar?: string | null): boolean {
    return avatar ? avatar.length > 8 : false;
  }
}
