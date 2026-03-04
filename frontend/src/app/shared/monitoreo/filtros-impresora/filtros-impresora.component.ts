import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Definimos el contrato de datos que le enviaremos al Padre
export interface FiltrosImpresora {
  busqueda: string;
  estado: number | 'todos';
  marcas: string[];
}

@Component({
  selector: 'app-filtros-impresora',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importante: FormsModule para ngModel
  templateUrl: './filtros-impresora.html',
  styleUrls: ['./filtros-impresora.scss']
})
export class FiltrosImpresoraComponent {
  @Input() marcasDisponibles: string[] = [];
  @Output() filtrosCambiados = new EventEmitter<FiltrosImpresora>();

  filtros: FiltrosImpresora = {
    busqueda: '',
    estado: 1, // Por defecto: 1 (Solo Monitoreadas)
    marcas: []
  };

  menuAbierto: boolean = false;

  // Cuando el usuario teclea en el buscador
  onSearchChange() {
    this.emitirFiltros();
  }

  abrirMenu() {
    this.menuAbierto = true;
  }

  cerrarMenu() {
    this.menuAbierto = false;
  }
  
  // Cuando cambia el select de estado
  onEstadoChange(event: any) {
    const val = event.target.value;
    this.filtros.estado = val === 'todos' ? 'todos' : Number(val);
    this.emitirFiltros();
  }

  // Cuando marca o desmarca un checkbox de marca
  toggleMarca(marca: string, event: any) {
    const checked = event.target.checked;
    if (checked) {
      this.filtros.marcas.push(marca);
    } else {
      this.filtros.marcas = this.filtros.marcas.filter(m => m !== marca);
    }
    this.emitirFiltros();
  }

  private emitirFiltros() {
    // Emitimos una copia del objeto para que el Padre detecte el cambio
    this.filtrosCambiados.emit({ ...this.filtros });
  }
}