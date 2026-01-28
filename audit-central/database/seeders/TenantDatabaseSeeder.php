<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Database\Seeders\Tenant\SettingSeeder;

class TenantDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ejecutamos el seeder de configuraciones (el que sí tienes)
        $this->call([
            SettingSeeder::class,
        ]);

        // 2. Creamos el usuario administrador del cliente
        // Sin roles complejos, solo el string 'viewer'
        User::create([
            'name' => 'Admin Cliente',
            'email' => 'admin@cliente.com',
            'password' => Hash::make('password'),
            'role' => 'viewer', 
            'active' => true,
        ]);
    }
}