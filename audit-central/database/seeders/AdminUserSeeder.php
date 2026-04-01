<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Role;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('name', 'admin')->first();

        if ($adminRole) {
            // Buscamos al usuario por email. Si no existe, lo creamos.
            $adminUser = User::firstOrCreate(
                ['email' => 'admin@admin.com'], // La llave de búsqueda
                [ // Los datos a insertar si no lo encuentra
                    'name' => 'Administrador',
                    'password' => bcrypt('T1cn2d3t4s0'),
                    'active' => true,
                ]
            );

            // syncWithoutDetaching asigna el rol solo si el usuario no lo tiene ya,
            // evitando duplicados en la tabla pivote.
            $adminUser->roles()->syncWithoutDetaching([$adminRole->id]);
        }
    }
}