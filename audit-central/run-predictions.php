<?php
// archivo: run-predictions.php
// Ubicación: C:\Users\asaavedra\Desktop\dashboard_2\audit-central\run-predictions.php

/**
 * Script directo para ejecutar predicciones sin queue
 * Uso: php run-predictions.php
 */

// Aumentar memoria
ini_set('memory_limit', '2048M');
ini_set('max_execution_time', 3600);

// Bootstrap Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Importar necesario
use App\Models\Tenant;
use App\Models\Tenant\Printer;
use App\Models\Tenant\PrinterSupply;
use App\Models\Tenant\PrinterCounter;
use App\Services\PredictionService;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Facades\Tenancy;

echo "╔════════════════════════════════════════════════════╗\n";
echo "║  GENERADOR DE SNAPSHOTS DE PREDICCIONES             ║\n";
echo "║  Inicio: " . now()->format('Y-m-d H:i:s') . "                      ║\n";
echo "╚════════════════════════════════════════════════════╝\n\n";

try {
    $predictionService = app(PredictionService::class);
    
    $tenants = Tenant::where('status', 'active')->get();
    echo "[INFO] Total de tenants encontrados: " . count($tenants) . "\n\n";

    $totalProcessed = 0;
    $totalFailed = 0;

    foreach ($tenants as $tenant) {
        echo "────────────────────────────────────────\n";
        echo "Procesando tenant: {$tenant->code}\n";
        echo "────────────────────────────────────────\n";
        
        Tenancy::initialize($tenant);

        try {
            $totalPrinters = Printer::count();
            $processedCount = 0;
            $failedCount = 0;

            echo "[INFO] Total de impresoras: $totalPrinters\n";
            echo "[INFO] Procesando en chunks de 50...\n\n";

            // Procesar en chunks
            Printer::chunkById(50, function ($printers) use (
                $tenant,
                $predictionService,
                &$processedCount,
                &$failedCount
            ) {
                $printerIds = $printers->pluck('id')->toArray();

                // Cargar datos para el chunk completo
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
                        $prediction = $predictionService->forPrinter(
                            $printer,
                            $supplies[$printer->id] ?? collect(),
                            $counters[$printer->id] ?? collect()
                        );

                        // Guardar en tabla
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
                                    'printer_name' => $printer->name,
                                    'model' => $printer->model,
                                    'risk_score' => (int) ($prediction['risk_score'] ?? 0),
                                    'most_critical_supply' => $prediction['most_critical_supply']['supply'] ?? null,
                                    'days_remaining' => $prediction['most_critical_supply']['days'] ?? null,
                                    'monthly_volume' => $prediction['monthly_volume_prediction'] ?? 0,
                                    'anomaly' => $prediction['anomaly'] ?? false,
                                    'snapshot_at' => now(),
                                    'updated_at' => now(),
                                ]
                            );
                        
                        $processedCount++;
                        echo ".";
                    } catch (\Exception $e) {
                        $failedCount++;
                        echo "x";
                        \Log::warning(
                            "Error en impresora {$printer->id}: " . $e->getMessage()
                        );
                    }
                }

                unset($supplies, $counters, $printers);
                gc_collect_cycles();
            });

            echo "\n\n";
            echo "[✓] Procesadas: $processedCount impresoras\n";
            if ($failedCount > 0) {
                echo "[✗] Fallidas: $failedCount impresoras\n";
            }

            $totalProcessed += $processedCount;
            $totalFailed += $failedCount;

        } catch (\Exception $e) {
            echo "[✗] Error: " . $e->getMessage() . "\n";
            \Log::error("Error en tenant {$tenant->code}: " . $e->getMessage());
        } finally {
            Tenancy::end();
        }

        echo "\n";
    }

    echo "╔════════════════════════════════════════════════════╗\n";
    echo "║  RESUMEN FINAL                                     ║\n";
    echo "╠════════════════════════════════════════════════════╣\n";
    echo "║ Total procesadas: $totalProcessed\n";
    echo "║ Total fallidas: $totalFailed\n";
    echo "║ Finalización: " . now()->format('Y-m-d H:i:s') . "\n";
    echo "╚════════════════════════════════════════════════════╝\n";

} catch (\Exception $e) {
    echo "\n[ERROR FATAL] " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}

exit(0);