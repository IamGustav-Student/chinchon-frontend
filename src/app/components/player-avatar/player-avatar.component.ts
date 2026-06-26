import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-player-avatar',
  imports: [],
  templateUrl: './player-avatar.component.html',
  styleUrl: './player-avatar.component.scss',
})
export class PlayerAvatarComponent {
  @Input() avatar = '🎴';
  @Input() username = '';
  @Input() score: number | null = null;
  @Input() isCurrentTurn = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
