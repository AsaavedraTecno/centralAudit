import { Injectable } from '@angular/core';
import { ImpresoraService } from '../../core/services/impresora.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DetalleImpresoraService {
  // Observable para notificar cuando se carga una impresora
  impresoraActual$ = new BehaviorSubject<any>(null);
  cargando$ = new BehaviorSubject<boolean>(false);

  constructor(private impresoraService: ImpresoraService) { }

  /**
   * Carga los detalles completos de una impresora desde el servidor
   */
  cargarDetallesCompletos(
    clientCode: string, 
    locationId: number, 
    printerId: number
  ): Observable<any> {
    this.cargando$.next(true);
    
    return this.impresoraService.obtenerDetalleImpresora(clientCode, locationId, printerId).pipe(
      tap({
        next: (response: any) => {
          if (response.success && response.data) {
            this.impresoraActual$.next({
              ...response.data,
              cliente_rut: clientCode,
              locationId: locationId
            });
          }
          this.cargando$.next(false);
        },
        error: () => {
          this.cargando$.next(false);
        }
      })
    );
  }

  /**
   * Actualiza los campos de inventario de una impresora
   */
  actualizarCamposInventario(
    clientCode: string, 
    printerId: number, 
    datos: any
  ): Observable<any> {
    this.cargando$.next(true);
    
    return this.impresoraService.updateAdminFields(clientCode, printerId, datos).pipe(
      tap({
        next: () => {
          this.cargando$.next(false);
        },
        error: () => {
          this.cargando$.next(false);
        }
      })
    );
  }

  /**
   * Obtiene la impresora actual cargada
   */
  getImpresoraActual(): any {
    return this.impresoraActual$.value;
  }

  /**
   * Limpia la impresora actual
   */
  limpiar(): void {
    this.impresoraActual$.next(null);
  }
}