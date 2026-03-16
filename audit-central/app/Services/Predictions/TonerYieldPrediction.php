<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterCounter;
use App\Models\Tenant\PrinterSupply;

class TonerYieldPrediction
{
    protected $defaultYield = [
        'toner_black' => 10000,
        'toner_cyan' => 8000,
        'toner_magenta' => 8000,
        'toner_yellow' => 8000
    ];

    public function predict($printerId, $supplyType)
    {
        $counter = PrinterCounter::where('printer_id', $printerId)
            ->orderByDesc('collected_at')
            ->first();

        if (!$counter) {
            return null;
        }

        $yield = $this->defaultYield[$supplyType] ?? null;

        if (!$yield) {
            return null;
        }

        $percentage = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->orderByDesc('read_at')
            ->value('percentage');

        if (!$percentage) {
            return null;
        }

        $pagesRemaining = ($percentage / 100) * $yield;

        return round($pagesRemaining);
    }
}