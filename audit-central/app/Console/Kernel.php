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
        $schedule->call(function () {
            echo "EJECUTANDO SNAPSHOT\n";

            app(\App\Services\Predictions\SnapshotService::class)->generate();

        })->everyMinute();

        // Trabajador en segundo plano para el Dashboard
        // Corre cada 5 minutos para no saturar los 30+ tenants al mismo tiempo
        // Cambia esto temporalmente:
        $schedule->command('dashboard:update-global-status')->everyMinute();
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