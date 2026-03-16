<?php

namespace App\Services\Predictions;

use App\Services\Predictions\TonerPrediction;
use App\Services\Predictions\AnomalyDetection;

class AlertEngine
{
    public function generate($printerId, $predictions, $anomaly, $volume)
    {
        $alerts = [];

        foreach ($predictions as $type => $data) {

            if (!isset($data['forecast'])) {
                continue;
            }

            $days = $data['forecast']['days_remaining'] ?? null;

            if ($days !== null && $days <= 3) {

                $alerts[] = [
                    'type' => 'critical',
                    'component' => $type,
                    'message' => "{$type} se agotará en {$days} días"
                ];
            }

            if ($days !== null && $days <= 7) {

                $alerts[] = [
                    'type' => 'warning',
                    'component' => $type,
                    'message' => "{$type} bajo"
                ];
            }
        }

        if ($anomaly) {

            $alerts[] = [
                'type' => 'anomaly',
                'message' => 'Uso de impresión anormal detectado'
            ];
        }

        if ($volume > 20000) {

            $alerts[] = [
                'type' => 'volume',
                'message' => 'Volumen de impresión alto'
            ];
        }

        return $alerts;
    }
}
