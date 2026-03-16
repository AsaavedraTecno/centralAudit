<?php

namespace App\Services\Predictions;

class RiskScore
{
    public function calculate(?int $tonerDays, bool $anomaly)
    {
        $score = 0;

        // Evaluar días restantes de toner
        if ($tonerDays !== null) {
            if ($tonerDays <= 0) {
                // SIN TONER - CRÍTICO
                $score += 100;
            } elseif ($tonerDays <= 3) {
                // 1-3 días - MUY CRÍTICO
                $score += 80;
            } elseif ($tonerDays <= 7) {
                // 4-7 días - CRÍTICO
                $score += 60;
            } elseif ($tonerDays <= 14) {
                // 8-14 días - ALERTA
                $score += 40;
            } elseif ($tonerDays <= 30) {
                // 15-30 días - ADVERTENCIA
                $score += 20;
            }
            // > 30 días = No suma puntos
        }

        // Sumar puntos por anomalía
        if ($anomaly) {
            $score += 40;
        }

        // Limitar a 100 puntos máximo
        return min($score, 100);
    }
}