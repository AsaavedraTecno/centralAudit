<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterSupply;
use Carbon\Carbon;

class TonerPrediction
{
    public function predict(int $printerId, string $supplyType, int $daysToAnalyze = 30)
    {
        $currentSupply = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->orderByDesc('read_at')
            ->first();

        if (!$currentSupply || $currentSupply->percentage <= 0) {
            return 0; // Se acabó
        }

        if ($currentSupply->percentage >= 95) {
             return null; // Está muy nuevo para predecir con precisión, evitamos números irreales como "900 días".
        }

        // Buscamos la lectura más antigua dentro de la ventana de análisis
        $oldSupply = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->where('read_at', '>=', now()->subDays($daysToAnalyze))
            ->orderBy('read_at', 'asc')
            ->first();

        if (!$oldSupply) {
            return null; // No hay historial
        }

        $consumed = $oldSupply->percentage - $currentSupply->percentage;
        $daysElapsed = Carbon::parse($oldSupply->read_at)->diffInDays($currentSupply->read_at);

        // Si pasaron menos de 24 horas (0 días completos) o si el nivel subió (cambio de tóner), abortamos.
        if ($daysElapsed < 1 || $consumed <= 0) {
            return null;
        }

        // Consumo Diario (%) = Consumido (%) / Días transcurridos
        $dailyConsumption = $consumed / $daysElapsed;

        // Días restantes = Nivel actual (%) / Consumo diario (%)
        $daysRemaining = $currentSupply->percentage / $dailyConsumption;

        return (int) round($daysRemaining);
    }
}