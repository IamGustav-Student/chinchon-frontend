import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  @Input() type: 'line' | 'card' | 'avatar' | 'table-row' = 'line';
  @Input() count = 1;

  get items() { return Array(this.count); }
}
