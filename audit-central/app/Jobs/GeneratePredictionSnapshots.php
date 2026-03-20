<?php

namespace App\Jobs;

use Illuminate\Support\Facades\DB;
use Illuminate\Contracts\Queue\ShouldQueue;
use Stancl\Tenancy\Facades\Tenancy;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GeneratePredictionSnapshots implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 3600;
    public $tries = 1;

    public function handle(\App\Services\Predictions\SnapshotService $service)
    {
        file_put_contents(storage_path('logs/test.log'), "JOB EJECUTADO\n", FILE_APPEND);
        echo "[" . now() . "] Iniciando generación de snapshots...\n";
        
        $service->generate();

        echo "\n[" . now() . "] ✓ Generación de snapshots completada\n";
        echo "EJECUTANDO JOB\n";
    }
}