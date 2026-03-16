<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterSupply;

class MaintenancePrediction
{
    public function predict($printerId, $component)
    {
        $percentage = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $component)
            ->orderByDesc('read_at')
            ->value('percentage');

        if (!$percentage) {
            return null;
        }

        return [
            'remaining_life_percent' => $percentage
        ];
    }
}