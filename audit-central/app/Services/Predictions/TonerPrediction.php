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
            ->orderBy('read_at')
            ->limit(20)
            ->get();

        if ($records->count() < 2) {
            return null;
        }

        $first = $records->first();
        $last = $records->last();

        $consumed = $first->percentage - $last->percentage;

        $days = Carbon::parse($first->read_at)
            ->diffInDays(Carbon::parse($last->read_at));

        if ($days === 0) {
            return null;
        }

        $dailyConsumption = $consumed / $days;

        if ($dailyConsumption <= 0) {
            return null;
        }

        return round($last->percentage / $dailyConsumption);
    }
}