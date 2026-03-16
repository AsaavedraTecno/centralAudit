<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Models\Tenant\Printer;
use App\Models\Tenant\PrinterSupply;
use App\Models\Tenant\PrinterCounter;
use App\Services\PredictionService;
use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Queue\ShouldQueue;
use Stancl\Tenancy\Facades\Tenancy;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GeneratePredictionSnapshots implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 3600;
    public $tries = 1;

    public function __construct(protected PredictionService $predictionService) {}

    public function handle()
    {
        echo "[" . now() . "] Iniciando generación de snapshots...\n";
        
        $tenants = Tenant::where('status', 'active')->get();
        echo "Total de tenants: " . count($tenants) . "\n\n";

        foreach ($tenants as $tenant) {
            echo "Procesando tenant: {$tenant->code}\n";
            
            Tenancy::initialize($tenant);

            try {
                $totalPrinters = 0;
                $processedPrinters = 0;
                $failedPrinters = 0;

                Printer::chunkById(50, function ($printers) use (
                    $tenant,
                    &$totalPrinters,
                    &$processedPrinters,
                    &$failedPrinters
                ) {
                    $printerIds = $printers->pluck('id')->toArray();
                    $totalPrinters += count($printers);

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
                            $prediction = $this->predictionService->forPrinter(
                                $printer,
                                $supplies[$printer->id] ?? collect(),
                                $counters[$printer->id] ?? collect()
                            );

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
                                        'risk_score' => (int) ($prediction['risk_score'] ?? 0),
                                        'most_critical_supply' => $prediction['most_critical_supply']['supply'] ?? null,
                                        'days_remaining' => $prediction['most_critical_supply']['days'] ?? null,
                                        'monthly_volume' => (int) ($prediction['monthly_volume_prediction'] ?? 0),
                                        'anomaly' => (bool) ($prediction['anomaly'] ?? false),
                                        'snapshot_at' => now(),
                                        'updated_at' => now(),
                                    ]
                                );
                            
                            $processedPrinters++;
                        } catch (\Exception $e) {
                            $failedPrinters++;
                            \Log::warning(
                                "Error procesando impresora {$printer->id} en tenant {$tenant->code}: " . 
                                $e->getMessage()
                            );
                        }
                    }

                    unset($supplies, $counters, $printers);
                    gc_collect_cycles();
                });

                echo "  ✓ Procesadas: $processedPrinters/$totalPrinters impresoras\n";
                if ($failedPrinters > 0) {
                    echo "  ✗ Fallidas: $failedPrinters impresoras\n";
                }
            } catch (\Exception $e) {
                echo "  ✗ Error en tenant: " . $e->getMessage() . "\n";
                \Log::error("Error procesando tenant {$tenant->code}: " . $e->getMessage());
            } finally {
                Tenancy::end();
            }
        }

        echo "\n[" . now() . "] ✓ Generación de snapshots completada\n";
    }
}