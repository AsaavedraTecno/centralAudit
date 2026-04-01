<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterCounter;
use App\Models\Tenant\PrinterSupply;

class TonerYieldPrediction
{
    // Mantenemos esto como "Plan B" (Fallback) si la máquina es nueva y no tiene historial
    protected $defaultYield = [
        'toner_black' => 10000,
        'toner_cyan' => 8000,
        'toner_magenta' => 8000,
        'toner_yellow' => 8000
    ];

    public function predict($printerId, $supplyType, $daysToAnalyze = 30)
    {
        $currentSupply = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->orderByDesc('read_at')
            ->first();

        if (!$currentSupply || $currentSupply->percentage <= 0) {
            return 0; // Ya está vacío
        }

        // --- INTENTO DE CÁLCULO DINÁMICO ---
        
        // 1. Buscamos una lectura antigua (hace X días) para comparar
        $oldSupply = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->where('read_at', '>=', now()->subDays($daysToAnalyze))
            ->orderBy('read_at', 'asc')
            ->first();

        // Si tenemos historial Y el porcentaje bajó (no lo recargaron entremedio)
        if ($oldSupply && $oldSupply->percentage > $currentSupply->percentage) {
            
            $percentConsumed = $oldSupply->percentage - $currentSupply->percentage;

            // 2. Buscamos contadores en las mismas fechas exactas
            $oldCounter = PrinterCounter::where('printer_id', $printerId)
                ->where('collected_at', '>=', $oldSupply->read_at)
                ->orderBy('collected_at', 'asc')
                ->first();

            $currentCounter = PrinterCounter::where('printer_id', $printerId)
                ->orderByDesc('collected_at')
                ->first();

            if ($oldCounter && $currentCounter) {
                // Si es color, usamos páginas a color. Si es negro, totales (o BN si lo prefieres)
                $isColor = in_array($supplyType, ['toner_cyan', 'toner_magenta', 'toner_yellow']);
                $pagesPrinted = $isColor 
                    ? ($currentCounter->color_pages - $oldCounter->color_pages)
                    : ($currentCounter->total_pages - $oldCounter->total_pages); // o usar bw_pages

                if ($pagesPrinted > 0) {
                    // ¡BINGO! Tenemos el rendimiento real
                    $pagesPerPercent = $pagesPrinted / $percentConsumed;
                    return round($currentSupply->percentage * $pagesPerPercent);
                }
            }
        }

        // --- FALLBACK: CÁLCULO TEÓRICO (Si falla lo anterior) ---
        $yield = $this->defaultYield[$supplyType] ?? 10000; // 10k por defecto si no está en la lista
        return round(($currentSupply->percentage / 100) * $yield);
    }
}