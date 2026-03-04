<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Tenant\User as TenantUser;
use Illuminate\Support\Facades\Hash;
use Database\Seeders\Tenant\SettingSeeder;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SettingSeeder::class,
        ]);
      
    }
}