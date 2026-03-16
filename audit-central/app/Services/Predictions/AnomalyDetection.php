<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterCounter;


class AnomalyDetection
{
    public function detect(int $printerId)
    {
        $records = PrinterCounter::where('printer_id', $printerId)
            ->orderByDesc('collected_at')
            ->limit(30)
            ->get();

        if ($records->count() < 2) {
            return false;
        }

        $avg = $records->avg('print_pages');

        $latest = $records->first()->print_pages;

        if ($avg == 0) {
            return false;
        }

        return $latest > ($avg * 3);
    }
}