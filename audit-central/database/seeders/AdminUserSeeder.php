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
            $adminUser = User::factory()->create([
                'name' => 'Administrador',
                'password' => bcrypt('T1cn2d3t4s0'),
                'email' => 'admin@admin.com',
                'active' => true,
            ]);
            $adminUser->roles()->attach($adminRole);
        }
    }
}
