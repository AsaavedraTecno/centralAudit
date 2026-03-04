<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VistaPersonalizada;
use App\Models\ColumnasDisponibles;

class VistaDefaultSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        $columnas = ColumnasDisponibles::all();

        $configColumnas = $columnas->map(function ($col) {
            return [
                'identificador' => $col->identificador,
                'visible' => true,
                'orden' => $col->orden,
                'ancho' => $col->ancho
            ];
        });

        VistaPersonalizada::create([
            'user_id' => 1, // o null si es global
            'nombre' => 'Vista Completa',
            'descripcion' => 'Todas las columnas visibles',
            'columnas' => $configColumnas,
            'es_default' => true
        ]);
    }
}
