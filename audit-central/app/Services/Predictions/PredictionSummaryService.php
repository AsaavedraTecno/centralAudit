<?php

namespace App\Services\Predictions;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
class PredictionSummaryService
{
    /**
     * Resumen global simple
     */
    public function getGlobalSummary()
    {
        $snapshots = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->select('risk_score')
            ->get();

        $total = $snapshots->count();
        $critical = $snapshots->where('risk_score', '>=', 70)->count();
        $warning = $snapshots->where('risk_score', '>=', 30)
                             ->where('risk_score', '<', 70)
                             ->count();

        return [
            'total' => $total,
            'critical' => $critical,
            'warning' => $warning
        ];
    }

    /**
     * Resumen global detallado con porcentajes
     */
    public function getGlobalSummaryDetailed()
    {
        $summary = $this->getGlobalSummary();
        
        $total = $summary['total'] ?? 0;
        $critical = $summary['critical'] ?? 0;
        $warning = $summary['warning'] ?? 0;
        $ok = $total - $critical - $warning;

        // Calcular porcentajes
        $criticalPercentage = $total > 0 ? round(($critical / $total) * 100, 2) : 0;
        $warningPercentage = $total > 0 ? round(($warning / $total) * 100, 2) : 0;
        $okPercentage = $total > 0 ? round(($ok / $total) * 100, 2) : 0;

        // Contar tenants y locations
        $totalTenants = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->select('tenant_id')
            ->distinct()
            ->count();

        $totalLocations = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->select('location_id')
            ->whereNotNull('location_id')
            ->distinct()
            ->count();

        return [
            'total' => $total,
            'critical' => $critical,
            'warning' => $warning,
            'ok' => $ok,
            'critical_percentage' => $criticalPercentage,
            'warning_percentage' => $warningPercentage,
            'ok_percentage' => $okPercentage,
            'total_tenants' => $totalTenants,
            'total_locations' => $totalLocations
        ];
    }

    /**
     * Resumen por tenant
     */
    public function getSummaryByTenant()
    {
        $snapshots = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->select('tenant_code', 'tenant_id', 'risk_score')
            ->get();

        $grouped = $snapshots->groupBy('tenant_code');
        
        $results = [];
        foreach ($grouped as $tenantCode => $items) {
            $total = $items->count();
            $critical = $items->where('risk_score', '>=', 70)->count();
            $warning = $items->where('risk_score', '>=', 30)
                            ->where('risk_score', '<', 70)
                            ->count();

            $results[] = [
                'tenant_code' => $tenantCode,
                'total' => $total,
                'critical' => $critical,
                'warning' => $warning,
                'critical_percentage' => $total > 0 ? round(($critical / $total) * 100, 2) : 0,
                'warning_percentage' => $total > 0 ? round(($warning / $total) * 100, 2) : 0,
                'ok_percentage' => $total > 0 ? round((($total - $critical - $warning) / $total) * 100, 2) : 0
            ];
        }

        return $results;
    }

    /**
     * Resumen por location
     */
    public function getSummaryByLocation()
    {
        $snapshots = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->select('location_id', 'location_name', 'tenant_code', 'risk_score')
            ->whereNotNull('location_id')
            ->get();

        $grouped = $snapshots->groupBy('location_id');
        
        $results = [];
        foreach ($grouped as $locationId => $items) {
            $total = $items->count();
            $critical = $items->where('risk_score', '>=', 70)->count();
            $warning = $items->where('risk_score', '>=', 30)
                            ->where('risk_score', '<', 70)
                            ->count();

            $results[] = [
                'location_id' => $locationId,
                'location_name' => $items->first()->location_name,
                'tenant_code' => $items->first()->tenant_code,
                'total' => $total,
                'critical' => $critical,
                'warning' => $warning,
                'critical_percentage' => $total > 0 ? round(($critical / $total) * 100, 2) : 0,
                'warning_percentage' => $total > 0 ? round(($warning / $total) * 100, 2) : 0,
                'ok_percentage' => $total > 0 ? round((($total - $critical - $warning) / $total) * 100, 2) : 0
            ];
        }

        return $results;
    }

    /**
     * Top impresoras críticas
     */
    public function getTopCritical($limit = 20)
    {
        return DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->where('risk_score', '>=', 70)
            ->orderByDesc('risk_score')
            ->limit($limit)
            ->select(
                'tenant_code',
                'printer_name',
                'model',
                'location_id',
                'location_name',
                'risk_score',
                'most_critical_supply',
                'days_remaining',
                'snapshot_at'
            )
            ->get()
            ->map(function ($printer) {
                return [
                    'tenant_code' => $printer->tenant_code,
                    'printer_name' => $printer->printer_name,
                    'model' => $printer->model,
                    'location_id' => $printer->location_id,
                    'location_name' => $printer->location_name,
                    'risk_score' => $printer->risk_score,
                    'risk_level' => $printer->risk_score >= 80 ? 'CRÍTICA' : 'ALTA',
                    'most_critical_supply' => $printer->most_critical_supply,
                    'days_remaining' => $printer->days_remaining,
                    'snapshot_at' => $printer->snapshot_at
                ];
            })
            ->toArray();
    }

    /**
     * Impresoras que necesitan atención inmediata (0-7 días)
     */
    public function getUrgent($limit = 10)
    {
        return DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->where(function ($query) {
                $query->where('risk_score', '>=', 70)
                      ->orWhere('days_remaining', '<=', 7);
            })
            ->orderByDesc('risk_score')
            ->limit($limit)
            ->select(
                'tenant_code',
                'printer_name',
                'model',
                'location_id',
                'location_name',
                'risk_score',
                'most_critical_supply',
                'days_remaining',
                'snapshot_at'
            )
            ->get()
            ->map(function ($printer) {
                return [
                    'tenant_code' => $printer->tenant_code,
                    'printer_name' => $printer->printer_name,
                    'model' => $printer->model,
                    'location_id' => $printer->location_id,
                    'location_name' => $printer->location_name,
                    'risk_score' => $printer->risk_score,
                    'risk_level' => $printer->risk_score >= 80 ? 'CRÍTICA' : 'ALTA',
                    'most_critical_supply' => $printer->most_critical_supply,
                    'days_remaining' => $printer->days_remaining,
                    'snapshot_at' => $printer->snapshot_at
                ];
            })
            ->toArray();
    }

    /**
     * Tendencia de últimos 30 días
     */
    public function getTrendData()
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        $snapshots = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->where('snapshot_at', '>=', $thirtyDaysAgo)
            ->select('snapshot_at', 'risk_score')
            ->get();

        // Agrupar por fecha
        $grouped = $snapshots->groupBy(function ($item) {
            return Carbon::parse($item->snapshot_at)->format('Y-m-d');
        });

        $trendData = [];
        foreach ($grouped as $date => $items) {
            $total = $items->count();
            $critical = $items->where('risk_score', '>=', 70)->count();
            $warning = $items->where('risk_score', '>=', 30)
                            ->where('risk_score', '<', 70)
                            ->count();
            $ok = $total - $critical - $warning;

            $trendData[] = [
                'date' => $date,
                'total' => $total,
                'critical' => $critical,
                'warning' => $warning,
                'ok' => $ok
            ];
        }

        return $trendData;
    }

    /**
     * Última actualización
     */
    public function getLastUpdate()
    {
        return DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->orderByDesc('snapshot_at')
            ->value('snapshot_at');
    }
}