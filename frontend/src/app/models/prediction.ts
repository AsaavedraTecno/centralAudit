export interface PredictionSupply {
  type: 'toner' | 'maintenance';

  pages_remaining?: number;

  days_remaining?: number;

  remaining_life?: number;

  forecast?: {
    days_remaining?: number;
    '30d'?: 'ok' | 'warning' | 'empty';
    '60d'?: 'ok' | 'warning' | 'empty';
    '90d'?: 'ok' | 'warning' | 'empty';
  };
}

export interface PredictionCriticalSupply {
  supply: string | null;
  days: number | null;
}

export interface PredictionAlert {
  type: 'critical' | 'warning' | 'info' | 'anomaly' | 'volume';
  component?: string;
  message: string;
}

export interface PrinterPrediction {
  printer_id: number;

  name: string;

  location_id?: number;

  predictions: {
    supplies_prediction: Record<string, PredictionSupply>;

    most_critical_supply: PredictionCriticalSupply;

    monthly_volume_prediction: number;

    anomaly_detected: boolean;

    risk_score: number;

    alerts: PredictionAlert[];
  };
}

export interface PredictionSummary {
  total: number;
  critical: number;
  warning: number;
}

export interface PredictionDashboard {
  printers: PrinterPrediction[];

  summary: PredictionSummary;
}