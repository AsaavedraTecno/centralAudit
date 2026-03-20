<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterCounter;
use Carbon\Carbon;

class VolumePrediction
{
    public function monthly(int $printerId)
    {
        $weekAgo = Carbon::now()->subDays(7);

        $records = PrinterCounter::where('printer_id', $printerId)
            ->where('collected_at', '>=', $weekAgo)
            ->orderBy('collected_at')
            ->get();

        // Se requiere al menos 2 lecturas distintas dentro de esa ventana de 7 dias, sino returna null (sin predicción).
        if ($records->count() < 2) {
            return null;
        }

        // Tomamos las lecturas del contador de la impresora de los últimos 7 días. 
        // Calculamos la diferencia de páginas entre la última lectura y la primera para saber el total semanal. 
        // Lo dividimos entre 7 para obtener el promedio diario real, y finalmente lo multiplicamos por 30 para proyectar el volumen mensual.
        $first = $records->first();
        $last = $records->last();

        //  Consumo = paginas ultimo dia - paginas primer dia 
        $pages = $last->total_pages - $first->total_pages;

        // Promedio diario = Consumo / 7
        $dailyAverage = $pages / 7;

        // proyección mensual = prom. diario * 30
        return round($dailyAverage * 30);

    }
}