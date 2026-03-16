<?php

namespace App\Services\Predictions;

use App\Models\Tenant\PrinterSupply;
use Carbon\Carbon;

class SupplyForecastPrediction
{
    public function forecast(int $printerId, string $supplyType)
    {
        $records = PrinterSupply::where('printer_id', $printerId)
            ->where('supply_type', $supplyType)
            ->where('read_at', '>=', now()->subDays(30))
            ->orderBy('read_at')
            ->get();

        if ($records->count() < 2) {
            return null;
        }

        $first = $records->first();
        $last = $records->last();

        $consumed = $first->percentage - $last->percentage;

        $days = Carbon::parse($first->read_at)
            ->diffInDays(Carbon::parse($last->read_at));

        if ($days === 0 || $consumed <= 0) {
            return null;
        }

        $dailyConsumption = $consumed / $days;

        $daysRemaining = $last->percentage / $dailyConsumption;

        return [
            'days_remaining' => round($daysRemaining),
            'forecast' => [
                '30d' => $this->statusForDays($daysRemaining, 30),
                '60d' => $this->statusForDays($daysRemaining, 60),
                '90d' => $this->statusForDays($daysRemaining, 90),
            ]
        ];
    }

    protected function statusForDays($daysRemaining, $target)
    {
        if ($daysRemaining <= $target) {
            return 'empty';
        }

        if ($daysRemaining <= ($target + 15)) {
            return 'warning';
        }

        return 'ok';
    }
}