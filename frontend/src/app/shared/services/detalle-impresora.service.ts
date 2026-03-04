import { Injectable } from '@angular/core';
import { ImpresoraService } from '../../core/services/impresora.service';
import { Observable, BehaviorSubject } from 'rxjs';

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
    
    return new Observable(observer => {
      this.impresoraService.obtenerDetalleImpresora(clientCode, locationId, printerId).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.impresoraActual$.next({
              ...response.data,
              cliente_rut: clientCode,
              locationId: locationId
            });
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error('No se pudieron cargar los detalles');
          }
          this.cargando$.next(false);
        },
        error: (err) => {
          observer.error(err);
          this.cargando$.next(false);
        }
      });
    });
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
    
    return new Observable(observer => {
      this.impresoraService.updateAdminFields(clientCode, printerId, datos).subscribe({
        next: (response: any) => {
          observer.next(response);
          observer.complete();
          this.cargando$.next(false);
        },
        error: (err) => {
          observer.error(err);
          this.cargando$.next(false);
        }
      });
    });
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