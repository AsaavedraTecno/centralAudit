import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  PredictionDashboard,
  PredictivePrinter,
  PredictionSummary,
  PredictionSummaryDetailed,
  TenantSummary,
  LocationSummary,
  CriticalPrinter,
  TrendData
} from '../../../models/prediction';


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

  // ENDPOINTS POR CLIENTE/TENANT

  /**
   * Predicciones globales del cliente
   * GET /tenants/{clientCode}/predictions/client
   */
  getGlobalPredictions(clientCode: string): Observable<PredictionDashboard> {
    return this.http.get<PredictionDashboard>(`${this.baseUrl}/tenants/${clientCode}/predictions/client`);
  }

  /**
   * Predicciones por sucursal/ubicación
   * GET /tenants/{clientCode}/predictions/location/{locationId}
   */
  getLocationPredictions(clientCode: string, locationId: number): Observable<any> {
      return this.http.get<any>(`${this.baseUrl}/tenants/${clientCode}/predictions/location/${locationId}`);
    }

  /**
   * Predicción de una impresora específica
   * GET /tenants/{clientCode}/predictions/printer/{printerId}
   */
  getPrinterPrediction(
    clientCode: string,
    printerId: number
  ): Observable<PredictivePrinter> {
    return this.http.get<PredictivePrinter>(
      `${this.baseUrl}/tenants/${clientCode}/predictions/printer/${printerId}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILIDADES LOCALES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Filtrar impresoras críticas (risk_score >= 70)
   */
  getCriticalPrinters(predictions: any[]): any[] {
    return predictions
      .filter(p => {
        const risk = p?.predictions?.risk_score ?? p?.risk_score ?? 0;
        return risk >= 70;
      })
      .sort((a, b) => {
        const ra = a?.predictions?.risk_score ?? a?.risk_score ?? 0;
        const rb = b?.predictions?.risk_score ?? b?.risk_score ?? 0;
        return rb - ra;
      })
      .slice(0, 10);
  }

  /**
   * Consumibles en riesgo (≤ 30 días)
   */
  getConsumablesRisk(predictions: PredictivePrinter[]) {
    const result: Record<string, number> = {};

    predictions.forEach(printer => {
      const issue = printer.predictedIssue;
      const days = printer.days_remaining;

      if (issue && issue !== 'Ninguno' && days !== undefined && days <= 30) {
        if (!result[issue]) {
          result[issue] = 0;
        }
        result[issue]++;
      }
    });

    return result;
  }
}
