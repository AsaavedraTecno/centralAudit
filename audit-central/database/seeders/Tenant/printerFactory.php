<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;



class printerFactory extends Seeder
{




    public function definition(): array
    {
        return [
            'name' => $this->faker->words(2, true),
            'brand' => $this->faker->randomElement(['HP', 'Lexmark', 'Brother', 'Kyocera', 'Ricoh']),
            'model' => $this->faker->bothify('LaserJet ##??'),
            'serial_number' => $this->faker->unique()->regexify('[A-Z]{3}[0-9]{6}'),
            'status' => $this->faker->randomElement(['active', 'inactive', 'maintenance']),
            'ip_address' => $this->faker->ipv4,
            'mac_address' => $this->faker->macAddress,
            'is_color' => $this->faker->boolean(40), // 40% son color
            'printer_type' => 'laser',
            'location_id' => 1, // Se sobrescribe en el Seeder
            'agent_id' => 1,    // Se sobrescribe en el Seeder
        ];
    }

}