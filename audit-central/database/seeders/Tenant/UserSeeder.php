<?php

namespace Database\Seeders\Tenant;

use App\Models\Tenant\Setting;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder{

    public function run(): void
    {
        \App\Models\User::create([
            'name' => 'Usuario Cliente',
            'email' => 'cliente@ejemplo.com',
            'password' => bcrypt('password_seguro'),
            'role' => 'viewer', 
            'active' => true,
        ]); 
    }

}