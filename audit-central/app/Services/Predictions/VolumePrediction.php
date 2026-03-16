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

        if ($records->count() < 2) {
            return null;
        }

        $first = $records->first();
        $last = $records->last();

        $pages = $last->total_pages - $first->total_pages;

        $dailyAverage = $pages / 7;

        return round($dailyAverage * 30);
    }
}