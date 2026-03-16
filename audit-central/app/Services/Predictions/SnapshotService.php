<?php

namespace App\Services\Predictions;

use App\Models\Tenant;
use App\Models\Tenant\Printer;
use App\Models\Tenant\PrinterSupply;
use App\Models\Tenant\PrinterCounter;
use App\Services\PredictionService;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Facades\Tenancy;
use Illuminate\Support\Facades\Log;

class SnapshotService
{
    protected PredictionService $predictionService;

    public function __construct(PredictionService $predictionService)
    {
        $this->predictionService = $predictionService;
    }

    public function generate()
    {
        $tenants = Tenant::where('status', 'active')->cursor();

        foreach ($tenants as $tenant) {

            Tenancy::initialize($tenant);

            try {
                Printer::chunkById(50, function ($printers) use ($tenant) {

                    $printerIds = $printers->pluck('id')->toArray();

                    // Precargar datos
                    $supplies = PrinterSupply::whereIn('printer_id', $printerIds)
                        ->orderBy('read_at')
                        ->get()
                        ->groupBy('printer_id');

                    $counters = PrinterCounter::whereIn('printer_id', $printerIds)
                        ->orderBy('collected_at')
                        ->get()
                        ->groupBy('printer_id');

                    foreach ($printers as $printer) {
                        try {
                            $prediction = $this->predictionService
                                ->forPrinter(
                                    $printer,
                                    $supplies[$printer->id] ?? collect(),
                                    $counters[$printer->id] ?? collect()
                                );

                            $risk = $prediction['risk_score'];
                            $critical = $prediction['most_critical_supply'];

                            DB::connection('central')
                                ->table('printer_prediction_snapshots')
                                ->updateOrInsert(
                                    [
                                        'tenant_id' => $tenant->id,
                                        'printer_id' => $printer->id,
                                    ],
                                    [
                                        'tenant_code' => $tenant->code,
                                        'location_id' => $printer->location_id,
                                        'location_name' => $printer->location?->name ?? null,
                                        'printer_name' => $printer->name,
                                        'model' => $printer->model,
                                        'risk_score' => (int) $risk,
                                        'most_critical_supply' => $critical['supply'] ?? null,
                                        'days_remaining' => $critical['days'] ?? null,
                                        'monthly_volume' => (int) ($prediction['monthly_volume_prediction'] ?? 0),
                                        'anomaly' => (bool) ($prediction['anomaly'] ?? false),
                                        'snapshot_at' => now(),
                                        'updated_at' => now(),
                                    ]
                                );
                        } catch (\Exception $e) {
                            Log::warning(
                                "Error en snapshot para impresora {$printer->id}: " . $e->getMessage()
                            );
                        }
                    }

                    unset($printers, $supplies, $counters);
                    gc_collect_cycles();
                });
            } finally {
                Tenancy::end();
            }
        }
    }
}