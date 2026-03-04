import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-impresoras-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './impresoras-grid.html',
  styleUrls: ['./impresoras-grid.scss']
})
export class ImpresorasGridComponent {

  @Input() impresoras: any[] = [];

  @Input() ordenarPor: string = '';

  @Input() direccionOrden: 'asc' | 'desc' = 'asc';

  @Output() verDetalles = new EventEmitter<any>();

  @Output() ordenar = new EventEmitter<string>();

  ordenarColumna(campo: string) {
    this.ordenar.emit(campo);
  }

}