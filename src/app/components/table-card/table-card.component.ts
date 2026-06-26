import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TableSummary } from '../../services/game.service';

@Component({
  selector: 'app-table-card',
  imports: [DecimalPipe],
  templateUrl: './table-card.component.html',
  styleUrl: './table-card.component.scss',
})
export class TableCardComponent {
  @Input() table!: TableSummary;
  @Output() join = new EventEmitter<string>();
  @Output() watch = new EventEmitter<string>();
}
