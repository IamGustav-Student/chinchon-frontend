import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  @Input() suit: 'oro' | 'copa' | 'basto' | 'espada' = 'oro';
  @Input() value: number = 1;
  @Input() faceDown = false;
  @Input() selected = false;
  @Input() disabled = false;
  @Output() cardClick = new EventEmitter<void>();

  get imageSrc(): string {
    return `/assets/cards/${this.suit}-${this.value}.webp`;
  }

  get label(): string {
    return `${this.value} de ${this.suit}`;
  }
}
