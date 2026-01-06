<?php

namespace App\Tenancy\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Stancl\Tenancy\Contracts\Tenant;
use Illuminate\Support\Facades\Artisan;

class SeedTenantDatabase implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public Tenant $tenant)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Inicializar tenancy para este tenant
        tenancy()->initialize($this->tenant);

        // Ejecutar seeders en orden
        Artisan::call('db:seed', [
            '--class' => 'Database\Seeders\Tenant\RolePermissionSeeder',
            '--database' => 'tenant',
        ]);

        Artisan::call('db:seed', [
            '--class' => 'Database\Seeders\Tenant\SettingSeeder',
            '--database' => 'tenant',
        ]);

        // Terminar tenancy
        tenancy()->end();
    }
}
