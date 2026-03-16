<?php

namespace App\Services;

use App\Models\Tenant\Printer;
use App\Models\Tenant\PrinterCounter;
use App\Models\Tenant\PrinterSupply;
use Carbon\Carbon;

// Prediction Services
use App\Services\Predictions\TonerPrediction;
use App\Services\Predictions\VolumePrediction;
use App\Services\Predictions\AnomalyDetection;
use App\Services\Predictions\RiskScore;
use App\Services\Predictions\AlertEngine;
use App\Services\Predictions\MaintenancePrediction;
use App\Services\Predictions\TonerYieldPrediction;
use App\Services\Predictions\SupplyForecastPrediction;

class PredictionService
{
    protected $tonerPrediction;
    protected $volumePrediction;
    protected $anomalyDetection;
    protected $riskScore;
    protected $alertEngine;
    protected $maintenancePrediction;
    protected $tonerYieldPrediction;
    protected $forecastPrediction;

    protected $tonerTypes = [
        'toner_black',
        'toner_cyan',
        'toner_magenta',
        'toner_yellow'
    ];

    public function __construct(
        TonerPrediction $tonerPrediction,
        VolumePrediction $volumePrediction,
        AnomalyDetection $anomalyDetection,
        RiskScore $riskScore,
        AlertEngine $alertEngine,
        MaintenancePrediction $maintenancePrediction,
        TonerYieldPrediction $tonerYieldPrediction,
        SupplyForecastPrediction $forecastPrediction,
    ) {
        $this->tonerPrediction = $tonerPrediction;
        $this->volumePrediction = $volumePrediction;
        $this->anomalyDetection = $anomalyDetection;
        $this->riskScore = $riskScore;
        $this->alertEngine = $alertEngine;
        $this->maintenancePrediction = $maintenancePrediction;
        $this->tonerYieldPrediction = $tonerYieldPrediction;
        $this->forecastPrediction = $forecastPrediction;
    }

    /**
     * Obtener tipos de consumibles disponibles para una impresora
     */
    public function getSuppliesForPrinter($printerId)
    {
        return PrinterSupply::where('printer_id', $printerId)
            ->whereNotNull('percentage')
            ->where('percentage', '>', 0)
            ->select('supply_type')
            ->distinct()
            ->pluck('supply_type')
            ->toArray();
    }

    /**
     * Encontrar el consumible más crítico
     */
    public function findMostCriticalSupply($predictions)
    {
        $minDays = null;
        $criticalSupply = null;

        foreach ($predictions as $type => $data) {
            $days = $data['days_remaining'] ?? null;

            if ($days === null) {
                continue;
            }

            if ($minDays === null || $days < $minDays) {
                $minDays = $days;
                $criticalSupply = $type;
            }
        }

        return [
            'supply' => $criticalSupply,
            'days' => $minDays
        ];
    }

    /**
     * Calcular predicción para UNA impresora
     * 
     * @param Printer|int $printer
     * @param Collection|null $supplies
     * @param Collection|null $counters
     * @return array
     */
    public function forPrinter($printer, $supplies = null, $counters = null)
    {
        $printerId = $printer instanceof Printer ? $printer->id : $printer;

        // Cargar datos si no se proporcionan
        if ($supplies === null) {
            $supplies = PrinterSupply::where('printer_id', $printerId)
                ->orderBy('read_at')
                ->get();
        }

        if ($counters === null) {
            $counters = PrinterCounter::where('printer_id', $printerId)
                ->orderBy('collected_at')
                ->get();
        }

        $predictions = [];

        // Agrupar consumibles por tipo
        $supplyTypes = $supplies->pluck('supply_type')->unique();

        foreach ($supplyTypes as $supplyType) {
            $supplyRecords = $supplies
                ->where('supply_type', $supplyType)
                ->values();

            if (in_array($supplyType, $this->tonerTypes)) {
                // TONER
                $pagesRemaining = null;
                $daysRemaining = null;

                // Intentar predecir páginas restantes
                try {
                    $pagesRemaining = $this->tonerYieldPrediction->predict($printerId, $supplyType);
                } catch (\Exception $e) {
                    \Log::debug("TonerYieldPrediction error: " . $e->getMessage());
                }

                if ($pagesRemaining === null || $pagesRemaining <= 0) {
                    // Fallback: usar días directamente
                    try {
                        $daysRemaining = $this->tonerPrediction->predict($printerId, $supplyType);
                    } catch (\Exception $e) {
                        \Log::debug("TonerPrediction error: " . $e->getMessage());
                    }
                } else {
                    // Calcular días basado en volumen
                    try {
                        $monthlyVolume = $this->volumePrediction->monthly($printerId) ?? 0;
                        $dailyVolume = $monthlyVolume > 0 ? round($monthlyVolume / 30) : 1;
                        $dailyVolume = max($dailyVolume, 1); 
                        $daysRemaining = round($pagesRemaining / $dailyVolume);
                    } catch (\Exception $e) {
                        \Log::debug("VolumePrediction error: " . $e->getMessage());
                        $daysRemaining = null;
                    }
                }

                $forecast = null;
                try {
                    if ($this->forecastPrediction && method_exists($this->forecastPrediction, 'forecastFromData')) {
                        $forecast = $this->forecastPrediction->forecastFromData($supplyRecords, $counters);
                    }
                } catch (\Exception $e) {
                    \Log::debug("SupplyForecastPrediction error: " . $e->getMessage());
                }

                $predictions[$supplyType] = [
                    'type' => 'toner',
                    'pages_remaining' => $pagesRemaining,
                    'days_remaining' => $daysRemaining,
                    'forecast' => $forecast
                ];
            } else {
                // MAINTENANCE
                $latestSupply = $supplyRecords->last();
                
                $maintenance = null;
                if ($latestSupply) {
                    $maintenance = [
                        'remaining_life_percent' => $latestSupply->percentage ?? 0,
                        'status' => $latestSupply->status ?? 'unknown'
                    ];
                }

                $predictions[$supplyType] = [
                    'type' => 'maintenance',
                    'remaining_life' => $maintenance
                ];
            }
        }

        // Encontrar consumible más crítico
        $critical = $this->findMostCriticalSupply($predictions);

        // Calcular volumen mensual
        $monthlyVolume = null;
        try {
            $monthlyVolume = $this->volumePrediction->monthly($printerId);
        } catch (\Exception $e) {
            \Log::debug("VolumePrediction monthly error: " . $e->getMessage());
        }

        // Detectar anomalías
        $anomaly = false;
        try {
            $anomaly = $this->anomalyDetection->detect($printerId);
        } catch (\Exception $e) {
            \Log::debug("AnomalyDetection error: " . $e->getMessage());
        }

        // Calcular risk score
        $riskScore = 0;
        try {
            $riskScore = $this->riskScore->calculate($critical['days'], $anomaly);
        } catch (\Exception $e) {
            \Log::debug("RiskScore error: " . $e->getMessage());
        }

        // Generar alertas
        $alerts = [];
        try {
            if ($this->alertEngine && method_exists($this->alertEngine, 'generateFromData')) {
                $printerObj = $printer instanceof Printer ? $printer : Printer::find($printerId);
                if ($printerObj) {
                    $alerts = $this->alertEngine->generateFromData(
                        $printerObj,
                        $predictions,
                        $anomaly,
                        $monthlyVolume ?? 0
                    );
                }
            }
        } catch (\Exception $e) {
            \Log::debug("AlertEngine error: " . $e->getMessage());
        }

        return [
            'supplies_prediction' => $predictions,
            'most_critical_supply' => $critical,
            'monthly_volume_prediction' => $monthlyVolume,
            'anomaly_detected' => $anomaly,
            'risk_score' => $riskScore ?? 0,
            'alerts' => $alerts
        ];
    }

    /**
     * Precargar contadores
     */
    public function preloadCounters($printerIds)
    {
        return PrinterCounter::whereIn('printer_id', $printerIds)
            ->orderBy('collected_at')
            ->get()
            ->groupBy('printer_id');
    }

    /**
     * Precargar consumibles
     */
    public function preloadSupplies($printerIds)
    {
        return PrinterSupply::whereIn('printer_id', $printerIds)
            ->orderBy('read_at')
            ->get()
            ->groupBy('printer_id');
    }

    /**
     * Predicciones para una ubicación
     */
    public function forLocation($locationId)
    {
        $printers = Printer::where('location_id', $locationId)->get();

        if ($printers->isEmpty()) {
            return collect();
        }

        $ids = $printers->pluck('id')->toArray();

        $supplies = $this->preloadSupplies($ids);
        $counters = $this->preloadCounters($ids);

        return $printers->map(function ($printer) use ($supplies, $counters) {
            return [
                'printer_id' => $printer->id,
                'name' => $printer->name,
                'model' => $printer->model,
                'location_id' => $printer->location_id,
                'predictions' => $this->forPrinter(
                    $printer,
                    $supplies[$printer->id] ?? collect(),
                    $counters[$printer->id] ?? collect()
                )
            ];
        });
    }

    /**
     * Predicciones para todo el cliente
     */
    public function forClient()
    {
        $printers = Printer::all();

        if ($printers->isEmpty()) {
            return collect();
        }

        $ids = $printers->pluck('id')->toArray();

        $supplies = $this->preloadSupplies($ids);
        $counters = $this->preloadCounters($ids);

        return $printers->map(function ($printer) use ($supplies, $counters) {
            return [
                'printer_id' => $printer->id,
                'name' => $printer->name,
                'location_id' => $printer->location_id,
                'predictions' => $this->forPrinter(
                    $printer,
                    $supplies[$printer->id] ?? collect(),
                    $counters[$printer->id] ?? collect()
                )
            ];
        });
    }

    /**
     * Calcular resumen
     */
    public function summary($predictions)
    {
        $critical = 0;
        $warning = 0;

        foreach ($predictions as $printer) {
            $risk = $printer['predictions']['risk_score'] ?? 0;

            if ($risk >= 70) {
                $critical++;
            } elseif ($risk >= 30) {
                $warning++;
            }
        }

        return [
            'total' => count($predictions),
            'critical' => $critical,
            'warning' => $warning
        ];
    }
}