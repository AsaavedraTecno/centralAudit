<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use App\Jobs\GeneratePredictionSnapshots;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Generar snapshots de predicciones cada noche a las 2 AM
        $schedule->job(new GeneratePredictionSnapshots())
            ->dailyAt('02:00')
            ->onOneServer()
            ->withoutOverlapping() // No ejecutar si ya está en progreso
            ->runInBackground();

        // ALTERNATIVA: Si prefieres cada 6 horas
        // $schedule->job(new GeneratePredictionSnapshots())
        //     ->everyFourHours()
        //     ->onOneServer()
        //     ->withoutOverlapping();

        // ALTERNATIVA: Si prefieres cada 1 hora (no recomendado para 1000 impresoras)
        // $schedule->job(new GeneratePredictionSnapshots())
        //     ->hourly()
        //     ->onOneServer()
        //     ->withoutOverlapping();
    }
    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}