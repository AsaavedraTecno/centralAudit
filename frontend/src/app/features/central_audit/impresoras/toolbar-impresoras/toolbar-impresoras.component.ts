import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toolbar-impresoras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar-impresoras.html',
  styleUrls: ['./toolbar-impresoras.scss']
})
export class ToolbarImpresorasComponent {

  @Input() modoVista: 'cards' | 'grid' = 'cards';

  @Output() cambiarVista = new EventEmitter<'cards' | 'grid'>();

  @Output() cambiarOrden = new EventEmitter<string>();

}