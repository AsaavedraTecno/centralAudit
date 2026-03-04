import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Impresora } from '../../../models/impresora';
import { Sucursal } from '../../../models/sucursal';
import { ImpresoraService } from '../../../core/services/impresora.service';

interface Serie {
  id?: number;
  serie?: string;
  ip?: string;
  fk_sucursalid?: string | number;
}

@Component({
  selector: 'app-asignar-impresoras',
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-impresoras.html',
  styleUrls: ['./asignar-impresoras.scss']
})
export class AsignarImpresoras implements OnInit {

  @Input() sucursal: Sucursal | null = null;
  @Input() clienteCode: string | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() actualizado = new EventEmitter<void>();  // Emitir cuando se actualicen las impresoras
  
  impresoras: Impresora[] = [];
  seriesAsignadas: Serie[] = [];
  asignacionesGlobales: any[] = [];  // NUEVA: todas las asignaciones del sistema
  impressorasAsignadas: Impresora[] = [];
  impressorasDisponibles: Impresora[] = [];
  cargando: boolean = false;
  guardando: boolean = false;
  mensaje: string = '';
  tipoMensaje: 'success' | 'error' | 'warning' | '' = '';

  constructor(private impresoraService: ImpresoraService) { }

  ngOnInit(): void {
    if (this.sucursal) {
      this.cargarDatos();
    }
  }

  cargarDatos(): void {
    if (!this.sucursal?.id) return;
    
    this.cargando = true;
    const sucursalId = typeof this.sucursal.id === 'string' ? parseInt(this.sucursal.id) : this.sucursal.id;
    
    this.impresoraService.getAll().subscribe({
      next: (impresoras: Impresora[]) => {
        this.impresoras = impresoras;
        
        this.impresoraService.getSeriesSucursales().subscribe({
          next: (asignacionesTotales: any[]) => {
            this.asignacionesGlobales = asignacionesTotales;
            this.seriesAsignadas = asignacionesTotales.filter(a => a.fk_sucursalid === sucursalId);
            this.separarImpresoras();
            this.cargando = false;
          },
          error: () => {
            this.impresoraService.getSeriesBySucursal(sucursalId).subscribe({
              next: (response: any) => {
                this.seriesAsignadas = response.data || [];
                this.separarImpresoras();
                this.cargando = false;
              },
              error: () => {
                this.separarImpresoras();
                this.cargando = false;
              }
            });
          }
        });
      },
      error: () => {
        this.mostrarMensaje('Error al cargar las impresoras', 'error');
        this.cargando = false;
      }
    });
  }

  separarImpresoras(): void {
    if (!this.sucursal?.id) return;
    
    const seriesAsignadasAEstaSucursalSet = new Set(this.seriesAsignadas.map(s => s.serie));
    
    this.impressorasAsignadas = this.impresoras.filter(imp => 
      seriesAsignadasAEstaSucursalSet.has(imp.serie)
    );
    
    const todasLasSeriesAsignadasEnSistema = new Set(this.asignacionesGlobales.map(a => a.serie));
    
    this.impressorasDisponibles = this.impresoras.filter(imp => 
      !todasLasSeriesAsignadasEnSistema.has(imp.serie)
    );
  }

  asignarImpresora(impresora: Impresora): void {
    if (!this.sucursal?.id || !impresora.serie || !impresora.ip) return;

    this.guardando = true;
    const sucursalId = this.sucursal.id; 
    this.impresoraService.asignarASucursal(impresora.serie, impresora.ip, sucursalId).subscribe({
      next: () => {
        this.mostrarMensaje('Impresora asignada correctamente', 'success');

        this.seriesAsignadas.push({
          serie: impresora.serie,
          ip: impresora.ip,
          fk_sucursalid: sucursalId
        });
        
        this.asignacionesGlobales.push({
          serie: impresora.serie,
          ip: impresora.ip,
          fk_sucursalid: sucursalId,
          rut: this.clienteCode || '',          
          sucursal_nombre: this.sucursal?.nombre || ''
        });
        
        this.separarImpresoras();
        this.actualizado.emit();
        
        this.guardando = false;
      },
      error: () => {
        this.mostrarMensaje('Error al asignar la impresora', 'error');
        this.guardando = false;
      }
    });
  }

  desasignarImpresora(impresora: Impresora): void {
    if (!this.sucursal?.id || !impresora.serie || !impresora.ip) return;

    if (confirm('¿Desea desasignar esta impresora de la sucursal?')) {
      this.guardando = true;
      const sucursalId = typeof this.sucursal.id === 'string' ? parseInt(this.sucursal.id) : this.sucursal.id;
      
      this.impresoraService.desasignarDeSucursal(impresora.serie, impresora.ip, sucursalId).subscribe({
        next: () => {
          this.mostrarMensaje('Impresora desasignada correctamente', 'success');
          this.seriesAsignadas = this.seriesAsignadas.filter(s => s.serie !== impresora.serie);
          this.asignacionesGlobales = this.asignacionesGlobales.filter(a => a.serie !== impresora.serie);
          this.separarImpresoras();
          
          // Limpiar caché de IndexedDB para que se recargue cuando se abra nuevamente
          if (this.sucursal) {
            this.sucursal.impresoras = undefined; // Forzar recarga
          }
          
          // ⭐ Emitir evento para que se actualice el padre
          this.actualizado.emit();
          
          this.guardando = false;
        },
        error: (error: any) => {
          console.error('Error al desasignar impresora:', error);
          this.mostrarMensaje('Error al desasignar la impresora', 'error');
          this.guardando = false;
        }
      });
    }
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'error' | 'warning' | ''): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
    
    setTimeout(() => {
      this.mensaje = '';
      this.tipoMensaje = '';
    }, 4000);
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
