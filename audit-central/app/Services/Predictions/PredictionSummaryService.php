<?php

namespace App\Services\Predictions;

use App\Models\Tenant\Printer;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
class PredictionSummaryService
{


    private function latestSnapshots()
    {
        return DB::connection('central')
            ->table('printer_prediction_snapshots as p1')
            ->join(
                DB::raw('(
                    SELECT printer_id, MAX(snapshot_at) as max_date
                    FROM printer_prediction_snapshots
                    GROUP BY printer_id
                ) as p2'),
                function ($join) {
                    $join->on('p1.printer_id', '=', 'p2.printer_id')
                        ->on('p1.snapshot_at', '=', 'p2.max_date');
                }
            );
    }


    /**
     * Resumen global simple
     */
    public function getGlobalSummary()
    {
        $snapshots = $this->latestSnapshots()
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
        $snapshots = $this->latestSnapshots()
            ->select('tenant_code', 'risk_score')
            ->get()
            ->groupBy('tenant_code');
        
        $results = [];
        foreach ($snapshots as $tenantCode => $items) {
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
        $snapshots = $this->latestSnapshots()
            ->whereNotNull('location_id')
            ->select('location_id', 'location_name', 'tenant_code', 'risk_score')
            ->get()
            ->groupBy('location_id');
        
        $results = [];
        foreach ($snapshots as $locationId => $items) {
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
        return $this->latestSnapshots()
            ->where('risk_score', '>=', 70)
            ->orderByDesc('risk_score')
            ->limit($limit)
            ->select(
                'printer_id',
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
                    'printer_id' => $printer->printer_id,
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
        return $this->latestSnapshots()
            ->where(function ($query) {
                $query->where('risk_score', '>=', 70)
                      ->orWhere('days_remaining', '<=', 7);
            })
            ->orderByDesc('risk_score')
            ->limit($limit)
            ->select(
                'p1.printer_id', 
                'p1.tenant_code',
                'p1.printer_name',
                'p1.model',
                'p1.location_id',
                'p1.location_name',
                'p1.risk_score',
                'p1.most_critical_supply',
                'p1.days_remaining',
                'p1.snapshot_at'
            )
            ->get()
            ->map(function ($printer) {
                return [
                    'printer_id' => $printer->printer_id, 
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
            ->select('snapshot_at', 'risk_score', 'printer_id')
            ->get();

        // Agrupar por fecha
        $grouped = $snapshots->groupBy(function ($item) {
            return Carbon::parse($item->snapshot_at)->format('Y-m-d');
        });

        $trendData = [];
        foreach ($grouped as $date => $items) {
            $latestPerPrinter = $items
                ->sortByDesc('snapshot_at')
                ->groupBy('printer_id')
                ->map(function ($group) {
                    return $group->first();
                });

            $total = $latestPerPrinter->count();

            $critical = $latestPerPrinter->where('risk_score', '>=', 70)->count();

            $warning = $latestPerPrinter->where('risk_score', '>=', 30)
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
        usort($trendData, fn($a, $b) => strcmp($a['date'], $b['date']));
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

    public function getLocationDashboard(string $tenantCode, int $locationId)
    {
        $snapshots = $this->latestSnapshots()
            ->where('tenant_code', $tenantCode)
            ->where('location_id', $locationId)
            ->get();

        $printerIds = $snapshots->pluck('printer_id')->filter()->toArray();
        $printersData = collect(); 

        if (!empty($printerIds)) {
            $tenant = \App\Models\Tenant::where('code', $tenantCode)->first(); 

            if ($tenant) {
                tenancy()->initialize($tenant);
                
                // 1. Traemos las impresoras con su IP
                $printers = \App\Models\Tenant\Printer::whereIn('id', $printerIds)->get()->keyBy('id');
                
                // 2. Traemos LOS ÚLTIMOS tóners de estas impresoras
                $latestSupplies = \App\Models\Tenant\PrinterSupply::whereIn('printer_id', $printerIds)
                    ->whereIn('supply_type', ['toner_black', 'toner_cyan', 'toner_magenta', 'toner_yellow'])
                    ->orderBy('read_at', 'desc')
                    ->get()
                    ->groupBy('printer_id')
                    ->map(function ($suppliesByPrinter) {
                        return $suppliesByPrinter->groupBy('supply_type')->map(fn($colorGroup) => $colorGroup->first()->percentage);
                    });

                // 3. Fusionamos los datos
                $printersData = $printers->map(function ($printer) use ($latestSupplies) {
                    $supplies = $latestSupplies->get($printer->id, collect());
                    
                    return (object)[
                        'internal_id' => $printer->internal_id,
                        'ip' => $printer->ip_address, 
                        'toner_black' => $supplies->get('toner_black', 0),
                        'toner_cyan' => $supplies->get('toner_cyan', 0),
                        'toner_magenta' => $supplies->get('toner_magenta', 0),
                        'toner_yellow' => $supplies->get('toner_yellow', 0),
                    ];
                });
                
                tenancy()->end(); 
            }
        }

        // CÁLCULO DE TENDENCIA (Últimos 30 días)
        $thirtyDaysAgo = Carbon::now()->subDays(30);

        $trendSnapshots = DB::connection('central')
            ->table('printer_prediction_snapshots')
            ->where('tenant_code', $tenantCode)
            ->where('location_id', $locationId) // Filtramos por la sucursal
            ->where('snapshot_at', '>=', $thirtyDaysAgo)
            ->select('snapshot_at', 'risk_score', 'printer_id')
            ->get();

        $groupedTrend = $trendSnapshots->groupBy(function ($item) {
            return Carbon::parse($item->snapshot_at)->format('Y-m-d');
        });

        $trendData = [];
        foreach ($groupedTrend as $date => $items) {
            $latestPerPrinter = $items
                ->sortByDesc('snapshot_at')
                ->groupBy('printer_id')
                ->map(function ($group) {
                    return $group->first();
                });

            $tTotal = $latestPerPrinter->count();
            $tCritical = $latestPerPrinter->where('risk_score', '>=', 70)->count();
            $tWarning = $latestPerPrinter->where('risk_score', '>=', 30)
                                        ->where('risk_score', '<', 70)
                                        ->count();
            $tOk = $tTotal - $tCritical - $tWarning;

            $trendData[] = [
                'date' => $date,
                'total' => $tTotal,
                'critical' => $tCritical,
                'warning' => $tWarning,
                'ok' => $tOk
            ];
        }
        usort($trendData, fn($a, $b) => strcmp($a['date'], $b['date']));

        // Cálculos del summary actual
        $total = $snapshots->count();
        $critical = $snapshots->where('risk_score', '>=', 70)->count();
        $warning = $snapshots->where('risk_score', '>=', 30)->where('risk_score', '<', 70)->count();
        $ok = $total - $critical - $warning;

        return [
            'summary' => [
                'total' => $total,
                'critical' => $critical,
                'warning' => $warning,
                'ok' => $ok
            ],
            
            'trend' => $trendData,

            'printers' => $snapshots->map(function ($p) use ($printersData) {
                $realPrinter = $printersData->get($p->printer_id);

                return [
                    'printer_id' => $p->printer_id,
                    'printer_name' => $p->printer_name,
                    'model' => $p->model,
                    'risk_score' => $p->risk_score,
                    'risk_level' => $p->risk_score >= 80 ? 'CRÍTICA' : ($p->risk_score >= 70 ? 'ALTA' : 'MEDIA'),
                    'location_id' => $p->location_id,
                    'location_name' => $p->location_name,
                    'most_critical_supply' => $p->most_critical_supply,
                    'days_remaining' => $p->days_remaining,
                    'snapshot_at' => $p->snapshot_at,
                    
                    'internal_id' => $realPrinter->internal_id ?? 'N/A',
                    'ip' => $realPrinter->ip ?? 'Sin IP',
                    'toner_black' => $realPrinter->toner_black ?? 0,
                    'toner_cyan' => $realPrinter->toner_cyan ?? 0,
                    'toner_magenta' => $realPrinter->toner_magenta ?? 0,
                    'toner_yellow' => $realPrinter->toner_yellow ?? 0,
                ];
            })->values()
        ];
    }

}