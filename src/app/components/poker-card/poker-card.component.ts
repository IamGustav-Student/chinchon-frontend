import { Component, Input, Output, EventEmitter } from '@angular/core';

export type PokerSuit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

@Component({
  selector: 'app-poker-card',
  imports: [],
  templateUrl: './poker-card.component.html',
  styleUrl: './poker-card.component.scss',
})
export class PokerCardComponent {
  @Input() suit: PokerSuit = 'spades';
  @Input() value: number = 1;   // 1=A, 2-10, 11=J, 12=Q, 13=K
  @Input() faceDown = false;
  @Input() selected = false;
  @Input() disabled = false;
  @Input() animateIn = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() cardClick = new EventEmitter<void>();

  get suitSymbol(): string {
    return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[this.suit];
  }

  get isRed(): boolean {
    return this.suit === 'hearts' || this.suit === 'diamonds';
  }

  get label(): string {
    const labels: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return labels[this.value] ?? String(this.value);
  }

  get ariaLabel(): string {
    return this.faceDown ? 'Carta boca abajo' : `${this.label} de ${this.suit}`;
  }
}
