<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Stancl\Tenancy\Tenancy;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        // ============================================
        // USUARIOS
        // ============================================
        
        $superadmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@tuempresa.cl',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
            'active' => true,
        ]);

        $analista = User::create([
            'name' => 'Juan Analista',
            'email' => 'analista@tuempresa.cl',
            'password' => Hash::make('password'),
            'role' => 'analista',
            'active' => true,
        ]);

        $tecnico = User::create([
            'name' => 'Pedro Técnico',
            'email' => 'tecnico@tuempresa.cl',
            'password' => Hash::make('password'),
            'role' => 'soporte',
            'active' => true,
        ]);

        $clienteUser = User::create([
            'name' => 'María Cliente',
            'email' => 'maria@empresaabc.cl',
            'password' => Hash::make('password'),
            'role' => 'cliente',
            'active' => true,
        ]);

        // ============================================
        // TENANTS (Clientes)
        // ============================================

        $tenant1 = Tenant::create([
            'id' => Str::uuid()->toString(),
            'rut' => '76.123.456-7',
            'nombre' => 'Empresa ABC Ltda',
            'code' => 'empresa-abc',
            'direccion' => 'Av. Providencia 1234',
            'comuna' => 'Providencia',
            'ciudad' => 'Santiago',
            'region' => 'Metropolitana',
            'contacto_nombre' => 'Juan Pérez',
            'contacto_email' => 'contacto@empresaabc.cl',
            'contacto_telefono' => '+56 9 1234 5678',
            'ti_nombre' => 'Carlos Tech',
            'ti_email' => 'ti@empresaabc.cl',
            'ti_telefono' => '+56 9 1111 2222',
            'status' => 'active',
            'contrato_inicio' => '2024-01-01',
        ]);

        $tenant2 = Tenant::create([
            'id' => Str::uuid()->toString(),
            'rut' => '77.654.321-K',
            'nombre' => 'Comercial XYZ SpA',
            'code' => 'comercial-xyz',
            'direccion' => 'Calle Comercio 567',
            'comuna' => 'Las Condes',
            'ciudad' => 'Santiago',
            'region' => 'Metropolitana',
            'contacto_nombre' => 'María González',
            'contacto_email' => 'admin@comercialxyz.cl',
            'contacto_telefono' => '+56 9 8765 4321',
            'status' => 'active',
            'contrato_inicio' => '2024-06-01',
        ]);

        $tenant3 = Tenant::create([
            'id' => Str::uuid()->toString(),
            'rut' => '71.999.888-5',
            'nombre' => 'Hospital del Valle',
            'code' => 'hospital-valle',
            'direccion' => 'Av. Salud 2000',
            'comuna' => 'Rancagua',
            'ciudad' => 'Rancagua',
            'region' => "O'Higgins",
            'contacto_nombre' => 'Dr. Roberto Sánchez',
            'contacto_email' => 'direccion@hospitalvalle.cl',
            'contacto_telefono' => '+56 2 2345 6789',
            'ti_nombre' => 'Felipe IT',
            'ti_email' => 'ti@hospitalvalle.cl',
            'ti_telefono' => '+56 9 5555 6666',
            'status' => 'active',
            'contrato_inicio' => '2023-03-15',
        ]);

        // ============================================
        // ASIGNAR USUARIOS A TENANTS
        // ============================================

        // Analista ve 2 clientes
        DB::table('user_tenant')->insert([
            ['user_id' => $analista->id, 'tenant_id' => $tenant1->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $analista->id, 'tenant_id' => $tenant2->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Técnico ve todos
        DB::table('user_tenant')->insert([
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant1->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant2->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant3->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Cliente solo ve su empresa
        DB::table('user_tenant')->insert([
            ['user_id' => $clienteUser->id, 'tenant_id' => $tenant1->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // ============================================
        // DATOS EN CADA TENANT
        // ============================================

        $this->seedTenantData($tenant1, [
            ['name' => 'Casa Matriz', 'code' => 'matriz', 'address' => 'Av. Providencia 1234, Santiago'],
            ['name' => 'Sucursal Viña', 'code' => 'vina', 'address' => 'Av. Valparaíso 567, Viña del Mar'],
        ]);

        $this->seedTenantData($tenant2, [
            ['name' => 'Oficina Central', 'code' => 'central', 'address' => 'Calle Principal 100, Concepción'],
        ]);

        $this->seedTenantData($tenant3, [
            ['name' => 'Edificio Principal', 'code' => 'principal', 'address' => 'Av. Salud 2000, Rancagua'],
            ['name' => 'Urgencias', 'code' => 'urgencias', 'address' => 'Av. Salud 2001, Rancagua'],
            ['name' => 'Laboratorio', 'code' => 'lab', 'address' => 'Av. Salud 2002, Rancagua'],
        ]);

        $this->command->info('✅ Demo data seeded successfully!');
        $this->command->info('');
        $this->command->info('Usuarios creados:');
        $this->command->info('  - admin@tuempresa.cl / password (superadmin)');
        $this->command->info('  - analista@tuempresa.cl / password (analista)');
        $this->command->info('  - tecnico@tuempresa.cl / password (soporte)');
        $this->command->info('  - maria@empresaabc.cl / password (cliente)');
    }

    private function seedTenantData(Tenant $tenant, array $locations): void
    {
        app(Tenancy::class)->initialize($tenant);

        foreach ($locations as $loc) {
            $locationId = DB::table('locations')->insertGetId([
                'name' => $loc['name'],
                'code' => $loc['code'],
                'address' => $loc['address'],
                'city' => 'Chile',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Crear 2-4 impresoras por sucursal
            $printers = $this->generatePrinters($locationId);
            DB::table('printers')->insert($printers);

            // Crear contadores y supplies para cada impresora
            $printerIds = DB::table('printers')->where('location_id', $locationId)->pluck('id');
            
            foreach ($printerIds as $printerId) {
                $this->seedPrinterData($printerId);
            }
        }

        app(Tenancy::class)->end();
    }

    private function generatePrinters(int $locationId): array
    {
        $models = [
            ['brand' => 'HP', 'model' => 'LaserJet Pro M404dn', 'is_color' => false, 'type' => 'laser'],
            ['brand' => 'HP', 'model' => 'Color LaserJet Pro MFP M479fdw', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'HP', 'model' => 'LaserJet Enterprise M507dn', 'is_color' => false, 'type' => 'laser'],
            ['brand' => 'Xerox', 'model' => 'VersaLink C405', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Xerox', 'model' => 'WorkCentre 6515', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Xerox', 'model' => 'Phaser 6510', 'is_color' => true, 'type' => 'laser'],
            ['brand' => 'Brother', 'model' => 'HL-L8360CDW', 'is_color' => true, 'type' => 'laser'],
            ['brand' => 'Brother', 'model' => 'MFC-L8900CDW', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Ricoh', 'model' => 'MP C3004', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Ricoh', 'model' => 'SP 5300DN', 'is_color' => false, 'type' => 'laser'],
            ['brand' => 'Konica Minolta', 'model' => 'bizhub C258', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Konica Minolta', 'model' => 'bizhub 458e', 'is_color' => false, 'type' => 'mfp'],
            ['brand' => 'Kyocera', 'model' => 'ECOSYS M8130cidn', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Lexmark', 'model' => 'MS826de', 'is_color' => false, 'type' => 'laser'],
        ];

        $count = rand(2, 4);
        $printers = [];
        $usedModels = [];

        for ($i = 0; $i < $count; $i++) {
            do {
                $model = $models[array_rand($models)];
            } while (in_array($model['model'], $usedModels));
            
            $usedModels[] = $model['model'];
            $ipSuffix = rand(10, 250);
            $macBytes = [];
            for ($j = 0; $j < 6; $j++) {
                $macBytes[] = sprintf('%02X', rand(0, 255));
            }

            $printers[] = [
                'location_id' => $locationId,
                'name' => $model['model'],
                'brand' => $model['brand'],
                'model' => $model['model'],
                'serial_number' => strtoupper($model['brand'][0] . $model['brand'][1] . Str::random(8)),
                'ip_address' => "192.168.1.{$ipSuffix}",
                'mac_address' => implode(':', $macBytes),
                'hostname' => strtolower(str_replace(' ', '-', $model['model'])) . '.local',
                'firmware_version' => rand(1, 5) . '.' . rand(0, 9) . '.' . rand(0, 99),
                'asset_tag' => 'PRN-' . date('Y') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'is_color' => $model['is_color'],
                'is_duplex' => true,
                'is_networked' => true,
                'printer_type' => $model['type'],
                'status' => 'active',
                'location' => 'Piso ' . rand(1, 5) . ', Sala ' . rand(1, 10),
                'last_seen_at' => now()->subMinutes(rand(1, 60)),
                'last_counter_at' => now()->subMinutes(rand(5, 120)),
                'notes' => rand(0, 3) === 0 ? 'Impresora de alto volumen' : null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $printers;
    }

    private function seedPrinterData(int $printerId): void
    {
        // Obtener info de la impresora para saber si es color
        $printer = DB::table('printers')->find($printerId);
        $isColor = $printer->is_color ?? true;

        // Contadores (últimos 30 días)
        $basePages = rand(5000, 80000);
        for ($i = 30; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dailyPrint = rand(100, 500);
            $totalPages = $basePages + (30 - $i) * $dailyPrint;
            $colorRatio = $isColor ? rand(20, 40) / 100 : 0;
            
            DB::table('printer_counters')->insert([
                'printer_id' => $printerId,
                'total_pages' => $totalPages,
                'bw_pages' => (int)($totalPages * (1 - $colorRatio)),
                'color_pages' => (int)($totalPages * $colorRatio),
                'collected_at' => $date,
                'created_at' => $date,
                'updated_at' => $date,
            ]);
        }

        // Supplies con escenarios variados
        $this->seedSupplies($printerId, $isColor);

        // Alertas basadas en niveles de supplies
        $this->seedAlerts($printerId);
    }

    private function seedSupplies(int $printerId, bool $isColor): void
    {
        // Escenarios de supplies
        $scenarios = [
            'healthy' => [
                'toner_black' => rand(60, 100),
                'drum_black' => rand(70, 100),
                'fusor' => rand(80, 100),
            ],
            'low_toner' => [
                'toner_black' => rand(5, 15),
                'drum_black' => rand(50, 80),
                'fusor' => rand(60, 90),
            ],
            'critical' => [
                'toner_black' => rand(1, 5),
                'drum_black' => rand(10, 30),
                'fusor' => rand(20, 40),
            ],
            'mixed' => [
                'toner_black' => rand(20, 50),
                'drum_black' => rand(40, 70),
                'fusor' => rand(50, 80),
            ],
        ];

        $scenario = array_rand($scenarios);
        $base = $scenarios[$scenario];

        $supplies = [
            'printer_id' => $printerId,
            'toner_black' => $base['toner_black'],
            'toner_cyan' => $isColor ? rand(10, 100) : null,
            'toner_magenta' => $isColor ? rand(10, 100) : null,
            'toner_yellow' => $isColor ? rand(10, 100) : null,
            'drum_black' => $base['drum_black'],
            'drum_cyan' => $isColor ? rand(30, 100) : null,
            'drum_magenta' => $isColor ? rand(30, 100) : null,
            'drum_yellow' => $isColor ? rand(30, 100) : null,
            'revelador_black' => rand(0, 1) ? rand(40, 100) : null,
            'revelador_cyan' => ($isColor && rand(0, 1)) ? rand(40, 100) : null,
            'revelador_magenta' => ($isColor && rand(0, 1)) ? rand(40, 100) : null,
            'revelador_yellow' => ($isColor && rand(0, 1)) ? rand(40, 100) : null,
            'fusor' => $base['fusor'],
            'adf_roller' => rand(0, 1) ? rand(50, 100) : null,
            'transfer_roller' => rand(60, 100),
            'mp_roller' => rand(0, 1) ? rand(50, 100) : null,
            'retard_pad' => rand(0, 1) ? rand(40, 100) : null,
            'waste_box' => rand(20, 100),
            'read_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        // Generar escenarios críticos para colores si es color
        if ($isColor && rand(0, 4) === 0) {
            // Un toner color crítico
            $colorCritical = ['toner_cyan', 'toner_magenta', 'toner_yellow'][rand(0, 2)];
            $supplies[$colorCritical] = rand(1, 10);
        }

        DB::table('printer_supplies')->insert($supplies);

        // Historial de supplies (últimos 7 días)
        for ($i = 7; $i >= 1; $i--) {
            $historicalSupplies = $supplies;
            $historicalSupplies['read_at'] = now()->subDays($i);
            $historicalSupplies['created_at'] = now()->subDays($i);
            $historicalSupplies['updated_at'] = now()->subDays($i);
            
            // Los niveles eran más altos antes
            foreach (['toner_black', 'toner_cyan', 'toner_magenta', 'toner_yellow'] as $toner) {
                if ($historicalSupplies[$toner] !== null) {
                    $historicalSupplies[$toner] = min(100, $historicalSupplies[$toner] + ($i * rand(1, 3)));
                }
            }
            
            DB::table('printer_supplies')->insert($historicalSupplies);
        }
    }

    private function seedAlerts(int $printerId): void
    {
        $supply = DB::table('printer_supplies')
            ->where('printer_id', $printerId)
            ->orderByDesc('read_at')
            ->first();

        if (!$supply) return;

        $alerts = [];

        // Alertas por toner bajo
        if ($supply->toner_black !== null && $supply->toner_black < 15) {
            $alerts[] = [
                'printer_id' => $printerId,
                'code' => 'LOW_TONER_BLACK',
                'severity' => $supply->toner_black < 5 ? 'error' : 'warn',
                'message' => "Tóner negro bajo: {$supply->toner_black}%",
                'raised_at' => now()->subHours(rand(1, 24)),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (['cyan', 'magenta', 'yellow'] as $color) {
            $field = "toner_{$color}";
            if ($supply->$field !== null && $supply->$field < 15) {
                $alerts[] = [
                    'printer_id' => $printerId,
                    'code' => 'LOW_TONER_' . strtoupper($color),
                    'severity' => $supply->$field < 5 ? 'error' : 'warn',
                    'message' => "Tóner {$color} bajo: {$supply->$field}%",
                    'raised_at' => now()->subHours(rand(1, 48)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Alertas por drum bajo
        if ($supply->drum_black !== null && $supply->drum_black < 20) {
            $alerts[] = [
                'printer_id' => $printerId,
                'code' => 'LOW_DRUM_BLACK',
                'severity' => 'warn',
                'message' => "Drum negro bajo: {$supply->drum_black}%",
                'raised_at' => now()->subHours(rand(1, 72)),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Alerta por fusor bajo
        if ($supply->fusor !== null && $supply->fusor < 30) {
            $alerts[] = [
                'printer_id' => $printerId,
                'code' => 'LOW_FUSER',
                'severity' => 'warn',
                'message' => "Fusor bajo: {$supply->fusor}%",
                'raised_at' => now()->subHours(rand(12, 96)),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Alerta por waste box lleno
        if ($supply->waste_box !== null && $supply->waste_box < 25) {
            $alerts[] = [
                'printer_id' => $printerId,
                'code' => 'WASTE_BOX_FULL',
                'severity' => 'error',
                'message' => "Contenedor de residuos casi lleno: {$supply->waste_box}% restante",
                'raised_at' => now()->subHours(rand(1, 12)),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($alerts)) {
            DB::table('alerts')->insert($alerts);
        }
    }
}
