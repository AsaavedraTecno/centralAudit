<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterSupply;
use Carbon\Carbon;

class TonerPrediction
{
    public function predict(int $printerId, string $supplyType)
    {
        $records = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->orderByDesc('read_at')
            ->limit(20)
            ->get()
            ->reverse()
            ->values();

        // Se requiere al menos 2 lecturas distintas dentro de esa ventana de 7 dias, sino returna null (sin predicción).
        if ($records->count() < 2) {
                return null;
            }

            $first = $records->first();
            $last = $records->last();

            // Calculamos cuánto consumió en esta ventana de tiempo. consumido (%) = nivel inicial - nivel final
            $consumed = $first->percentage - $last->percentage;

            // Calculamos cuántos días pasaron en esta ventana de tiempo. Consumo Diario (%) = Consumido (%) / Dias transcurridos
            $days = Carbon::parse($first->read_at)->diffInDays(Carbon::parse($last->read_at));

            // Si no han pasado días o si mágicamente subió el porcentaje (ej. cambio de tóner), abortamos
            if ($days === 0 || $consumed <= 0) {
                return null;
            }

            // Consumo Diario (%) = Consumido (%) / Dias transcurridos
            $dailyConsumption = $consumed / $days;

            // Proyectamos los días restantes basados en el consumo diario actual
            // Dias restantes = Nivel actual (%) / Consumo diario (%)
            return (int) round($last->percentage / $dailyConsumption);
    }
}