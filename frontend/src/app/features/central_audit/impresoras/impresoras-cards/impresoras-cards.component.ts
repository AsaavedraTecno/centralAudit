import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-impresoras-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './impresoras-cards.html',
  styleUrls: ['./impresoras-cards.scss']
})
export class ImpresorasCardsComponent {

  @Input() impresoras: any[] = [];

  @Output() verDetalles = new EventEmitter<any>();
  @Output() toggleEstado = new EventEmitter<any>();
  @Output() transferir = new EventEmitter<any>();

}