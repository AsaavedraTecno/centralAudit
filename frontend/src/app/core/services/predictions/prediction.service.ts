import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  PredictionDashboard,
  PrinterPrediction,
  PredictionSummary
} from '../../../models/prediction';

export interface PredictionSummaryDetailed extends PredictionSummary {
  critical_percentage: number;
  warning_percentage: number;
  ok_percentage: number;
  total_tenants: number;
  total_locations: number;
}

export interface TenantSummary extends PredictionSummary {
  tenant_code: string;
  critical_percentage: number;
  warning_percentage: number;
  ok_percentage: number;
}

export interface LocationSummary extends TenantSummary {
  location_id: number;
}

export interface CriticalPrinter {
  tenant_code: string;
  printer_name: string;
  model: string;
  location_id: number;
  risk_score: number;
  risk_level: string;
  most_critical_supply: string;
  days_remaining: number;
  snapshot_at: string;
}

export interface TrendData {
  date: string;
  total: number;
  critical: number;
  warning: number;
  ok: number;
}

@Injectable({
  providedIn: 'root'
})
export class PredictionService {

  private baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════════════════════════
  // ENDPOINTS GLOBALES DEL SISTEMA (Central)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Resumen global simple
   * GET /api/predictions/summary
   */
  getGlobalSummary(): Observable<PredictionSummary> {
    return this.http.get<PredictionSummary>(
      `${this.baseUrl}/predictions/summary`
    );
  }

  /**
   * Resumen global detallado con porcentajes
   * GET /api/predictions/summary/detailed
   */
  getGlobalSummaryDetailed(): Observable<PredictionSummaryDetailed> {
    return this.http.get<PredictionSummaryDetailed>(
      `${this.baseUrl}/predictions/summary/detailed`
    );
  }

  /**
   * Resumen por tenant
   * GET /api/predictions/summary/by-tenant
   */
  getSummaryByTenant(): Observable<TenantSummary[]> {
    return this.http.get<TenantSummary[]>(
      `${this.baseUrl}/predictions/summary/by-tenant`
    );
  }

  /**
   * Resumen por ubicación
   * GET /api/predictions/summary/by-location
   */
  getSummaryByLocation(): Observable<LocationSummary[]> {
    return this.http.get<LocationSummary[]>(
      `${this.baseUrl}/predictions/summary/by-location`
    );
  }
  /**
   * Top impresoras críticas
   * GET /api/predictions/critical-top?limit=20
   */
  getTopCritical(limit: number = 20): Observable<CriticalPrinter[]> {
    return this.http.get<CriticalPrinter[]>(
      `${this.baseUrl}/predictions/critical-top?limit=${limit}`
    );
  }

  /**
   * Impresoras que necesitan atención inmediata
   * GET /api/predictions/urgent?limit=10
   */
  getUrgent(limit: number = 10): Observable<CriticalPrinter[]> {
    return this.http.get<CriticalPrinter[]>(
      `${this.baseUrl}/predictions/urgent?limit=${limit}`
    );
  }

  /**
   * Tendencia de últimos 30 días
   * GET /api/predictions/trend
   */
  getTrendData(): Observable<TrendData[]> {
    return this.http.get<TrendData[]>(
      `${this.baseUrl}/predictions/trend`
    );
  }

  /**
   * Última actualización de snapshots
   * GET /api/predictions/last-update
   */
  getLastUpdate(): Observable<{ last_update: string | null }> {
    return this.http.get<{ last_update: string | null }>(
      `${this.baseUrl}/predictions/last-update`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ENDPOINTS POR CLIENTE/TENANT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Predicciones globales del cliente
   * GET /tenants/{clientCode}/predictions/client
   */
  getGlobalPredictions(clientCode: string): Observable<PredictionDashboard> {
    return this.http.get<any>(
      `${this.baseUrl}/tenants/${clientCode}/predictions/client`
    );
  }

  /**
   * Predicciones por sucursal/ubicación
   * GET /tenants/{clientCode}/predictions/location/{locationId}
   */
  getLocationPredictions(
    clientCode: string,
    locationId: number
  ): Observable<PredictionDashboard> {
    return this.http.get<any>(
      `${this.baseUrl}/tenants/${clientCode}/predictions/location/${locationId}`
    );
  }

  /**
   * Predicción de una impresora específica
   * GET /tenants/{clientCode}/predictions/printer/{printerId}
   */
  getPrinterPrediction(
    clientCode: string,
    printerId: number
  ): Observable<PrinterPrediction> {
    return this.http.get<PrinterPrediction>(
      `${this.baseUrl}/tenants/${clientCode}/predictions/printer/${printerId}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILIDADES LOCALES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Filtrar impresoras críticas (risk_score >= 70)
   */
  getCriticalPrinters(predictions: PrinterPrediction[]): PrinterPrediction[] {
    return predictions
      .filter(p => p.predictions.risk_score >= 70)
      .sort((a, b) => b.predictions.risk_score - a.predictions.risk_score)
      .slice(0, 10);
  }

  /**
   * Consumibles en riesgo (≤ 30 días)
   */
  getConsumablesRisk(predictions: PrinterPrediction[]) {
    const result: Record<string, number> = {};

    predictions.forEach(printer => {
      const supplies = printer.predictions.supplies_prediction;

      Object.keys(supplies).forEach(type => {
        const supply = supplies[type];
        const days = supply?.forecast?.days_remaining;

        if (days !== undefined && days !== null && days <= 30) {
          if (!result[type]) {
            result[type] = 0;
          }
          result[type]++;
        }
      });
    });

    return result;
  }

}