<?php

namespace Database\Seeders;

use App\Models\ColumnasDisponibles;
use Illuminate\Database\Seeder;

class ColumnasDisponiblesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Este seeder inserta las 41 columnas disponibles en la tabla.
     * 
     * Ejecutar:
     * php artisan db:seed --class=ColumnasDisponiblesSeeder
     * 
     * O como parte del seed general:
     * php artisan db:seed
     */
    public function run(): void
    {
        $columnas = [
            // ===== CLIENTE =====
            [
                'identificador' => 'cliente_rut',
                'nombre' => 'RUT Cliente',
                'tipo' => 'cliente',
                'visible' => false,
                'orden' => 2,
                'ancho' => 120,
                'componente' => 'texto',
                'activa' => true,
            ],

            // ===== IMPRESORA - IDENTIFICACIÓN =====
            [
                'identificador' => 'imp_modelo',
                'nombre' => 'Modelo',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 5,
                'ancho' => 120,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_serie',
                'nombre' => 'Serie',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 6,
                'ancho' => 120,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_serie_secundaria',
                'nombre' => 'Serie Secundaria',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 7,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_id_interno',
                'nombre' => 'ID Interno',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 8,
                'ancho' => 120,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_ip',
                'nombre' => 'IP Address',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 9,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_mac',
                'nombre' => 'MAC Address',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 42,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_online',
                'nombre' => 'Online',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 43,
                'ancho' => 100,
                'componente' => 'badge',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_minutos_sin_conexion',
                'nombre' => 'Min. Sin Conexión',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 44,
                'ancho' => 120,
                'componente' => 'numero',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_firmware',
                'nombre' => 'Firmware',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 46,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],

            // ===== IMPRESORA - UBICACIÓN Y NOTAS =====
            [
                'identificador' => 'imp_ubicacion',
                'nombre' => 'Ubicación',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 10,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_ubicacion_manual',
                'nombre' => 'Ubicación Manual',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 11,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_descripcion',
                'nombre' => 'Descripción',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 12,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_comentarios',
                'nombre' => 'Comentarios',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 13,
                'ancho' => 200,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_campo_extra_1',
                'nombre' => 'Campo Extra 1',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 14,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_campo_extra_2',
                'nombre' => 'Campo Extra 2',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 15,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],

            // ===== IMPRESORA - ESTADO Y OPERACIÓN =====
            [
                'identificador' => 'imp_estado',
                'nombre' => 'Estado',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 16,
                'ancho' => 100,
                'componente' => 'badge',
                'activa' => true,
            ],

            [
                'identificador' => 'imp_ultima_conexion',
                'nombre' => 'Última Conexión',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 18,
                'ancho' => 150,
                'componente' => 'texto',
                'activa' => true,
            ],

            // ===== MÉTRICAS DE IMPRESIÓN =====
            [
                'identificador' => 'imp_paginas_impresas',
                'nombre' => 'Págs. Impresas',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 20,
                'ancho' => 100,
                'componente' => 'numero',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_impreso_hoy',
                'nombre' => 'Imp. Hoy',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 21,
                'ancho' => 100,
                'componente' => 'numero',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_impreso_mes',
                'nombre' => 'Imp. Mes',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 22,
                'ancho' => 100,
                'componente' => 'numero',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_paginas_bn',
                'nombre' => 'Págs. B/N',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 23,
                'ancho' => 100,
                'componente' => 'numero',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_paginas_color',
                'nombre' => 'Págs. Color',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 24,
                'ancho' => 100,
                'componente' => 'numero',
                'activa' => true,
            ],

            // ===== TÓNERS =====
            [
                'identificador' => 'imp_toner_black',
                'nombre' => 'Black Tóner',
                'tipo' => 'impresora',
                'visible' => true,
                'orden' => 25,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_toner_cyan',
                'nombre' => 'Cyan Tóner',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 26,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_toner_magenta',
                'nombre' => 'Magenta Tóner',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 27,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_toner_yellow',
                'nombre' => 'Yellow Tóner',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 28,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],

            // ===== DRUMS =====
            [
                'identificador' => 'imp_drum_black',
                'nombre' => 'Black Drum',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 29,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_drum_cyan',
                'nombre' => 'Cyan Drum',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 30,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_drum_magenta',
                'nombre' => 'Magenta Drum',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 31,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_drum_yellow',
                'nombre' => 'Yellow Drum',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 32,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],

            // ===== REVELADOR =====
            [
                'identificador' => 'imp_revelador_black',
                'nombre' => 'Black Revelador',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 33,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_revelador_magenta',
                'nombre' => 'Magenta Revelador',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 34,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_revelador_yellow',
                'nombre' => 'Yellow Revelador',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 35,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],

            // ===== COMPONENTES VARIOS =====
            [
                'identificador' => 'imp_fusor',
                'nombre' => 'Fusor',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 36,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_adf_roller',
                'nombre' => 'ADF Roller',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 37,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_transfer_roller',
                'nombre' => 'Transfer Roller',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 38,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_mp_roller',
                'nombre' => 'MP Roller',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 39,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_retard_pad',
                'nombre' => 'Retard Pad',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 40,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
            [
                'identificador' => 'imp_caja_residuos',
                'nombre' => 'Caja Residuos',
                'tipo' => 'impresora',
                'visible' => false,
                'orden' => 41,
                'ancho' => 110,
                'componente' => 'barra',
                'activa' => true,
            ],
        ];

        // Insertar todas las columnas
        foreach ($columnas as $columna) {
            ColumnasDisponibles::create($columna);
        }
    }
}