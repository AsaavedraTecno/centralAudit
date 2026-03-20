export interface PredictionSummary {
  total: number;
  critical: number;
  warning: number;
  ok?: number;
}

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
  location_name: string;
}

export interface PredictivePrinter {
id?: number;
  nombre?: string;
  modelo?: string;
  serie?: string;
  internal_id?: string;
  ip?: string;
  estado?: number;
  
  predictionStatus?: 'critical' | 'risk' | 'ok';
  daysRemaining?: number;
  predictedIssue?: string;
  recommendedAction?: string;
  
  tonerBlack?: number;
  tonerCyan?: number;
  tonerMagenta?: number;
  tonerYellow?: number;

  printer_id?: number;
  tenant_code?: string;
  printer_name?: string;
  model?: string;
  location_id?: number | string;
  location_name?: string;
  
  risk_score?: number | string;
  risk_level?: string;
  most_critical_supply?: string;
  days_remaining?: number;
  snapshot_at?: string;
}

// CriticalPrinter es simplemente un alias de PredictivePrinter.
export type CriticalPrinter = PredictivePrinter;

export interface TrendData {
  date: string;
  total: number;
  critical: number;
  warning: number;
  ok: number;
}

export interface PredictionDashboard {
  summary: PredictionSummary;
  trend: TrendData[];
  printers: PredictivePrinter[];
}