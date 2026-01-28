<?php

namespace App\Tenancy\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Stancl\Tenancy\Contracts\Tenant;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

class SeedTenantDatabase implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Tenant $tenant)
    {
    }

    public function handle(): void
    {
        tenancy()->initialize($this->tenant);
        Artisan::call('db:seed', [
            '--class' => 'Database\Seeders\Tenant\SettingSeeder',
            '--database' => 'tenant',
        ]);

        tenancy()->end();
    }
}