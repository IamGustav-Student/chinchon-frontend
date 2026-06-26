import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent implements OnChanges {
  @Input() suit: 'oro' | 'copa' | 'basto' | 'espada' = 'oro';
  @Input() value: number = 1;
  @Input() faceDown = false;
  @Input() selected = false;
  @Input() disabled = false;
  @Input() animateIn = false;   // dispara slide-in al aparecer
  @Output() cardClick = new EventEmitter<void>();

  flipping = false;
  prevFaceDown = false;

  ngOnChanges() {
    // Animar flip cuando cambia faceDown (carta que se da vuelta)
    if (this.prevFaceDown !== this.faceDown) {
      this.flipping = true;
      setTimeout(() => { this.flipping = false; }, 400);
      this.prevFaceDown = this.faceDown;
    }
  }

  get imageSrc(): string {
    return `/assets/cards/${this.suit}-${this.value}.webp`;
  }

  get label(): string {
    return `${this.value} de ${this.suit}`;
  }
}
