import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VistaPersonalizadaService } from '../../services/vista-personalizada.service';
import { VistaStateService } from '../../services/vista-state.service';
import { VistaPersonalizada } from '../../../models/vista-personalizada';

@Component({
  selector: 'app-vista-selector',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './vista-selector.component.html',
  styleUrls: ['./vista-selector.component.scss']
})
export class VistaSelectorComponent implements OnInit, OnDestroy {
  vistas: VistaPersonalizada[] = [];
  vistaActiva: VistaPersonalizada | null = null;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private vistaService: VistaPersonalizadaService,
    private vistaState: VistaStateService
  ) {}

  ngOnInit(): void {
    // Cargar vistas disponibles
    this.cargarVistas();

    // Suscribirse a cambios de vista activa
    this.vistaState.obtenerVistaActiva()
      .pipe(takeUntil(this.destroy$))
      .subscribe(vista => {
        this.vistaActiva = vista;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar todas las vistas del usuario
   */
  cargarVistas(): void {
    this.loading = true;
    this.error = null;

    this.vistaService.obtenerVistas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.vistas = response.data;
          this.loading = false;

          // Si no hay vista activa, establecer la primera (o por defecto)
          if (!this.vistaActiva && this.vistas.length > 0) {
            const vistaPorDefecto = this.vistas.find(v => v.es_default) || this.vistas[0];
            this.seleccionarVista(vistaPorDefecto);
          }
        },
        error: (err) => {
          console.error('Error cargando vistas:', err);
          this.error = 'Error al cargar las vistas';
          this.loading = false;
        }
      });
  }

  /**
   * Seleccionar una vista y actualizar el estado global
   */
  seleccionarVista(vista: VistaPersonalizada): void {
    this.vistaState.establecerVistaActiva(vista);
  }

  /**
   * Obtener el nombre de la vista activa
   */
  obtenerNombreVistaActiva(): string {
    return this.vistaActiva?.nombre || 'Seleccionar vista';
  }
}