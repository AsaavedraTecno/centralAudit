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

        DB::table('user_tenant')->insert([
            ['user_id' => $analista->id, 'tenant_id' => $tenant1->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $analista->id, 'tenant_id' => $tenant2->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant1->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant2->id, 'created_at' => now(), 'updated_at' => now()],
            ['user_id' => $tecnico->id, 'tenant_id' => $tenant3->id, 'created_at' => now(), 'updated_at' => now()],
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
        ]);

        $this->command->info('✅ Demo data seeded successfully!');
    }

    private function seedTenantData(Tenant $tenant, array $locations): void
    {
        app(Tenancy::class)->initialize($tenant);

        // Crear un agente para este tenant
        $agentId = DB::table('agent_status')->insertGetId([
            'hostname' => 'AGENT-' . strtoupper($tenant->code),
            'status' => 'online',
            'last_sync_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

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

            // Generar impresoras
            $printers = $this->generatePrinters($locationId, $agentId);
            
            foreach ($printers as $printerData) {
                $printerId = DB::table('printers')->insertGetId($printerData);
                $this->seedPrinterData($printerId);
            }
        }

        app(Tenancy::class)->end();
    }

    private function generatePrinters(int $locationId, int $agentId): array
    {
        $models = [
            ['brand' => 'HP', 'model' => 'LaserJet Pro M404dn', 'is_color' => false, 'type' => 'laser'],
            ['brand' => 'HP', 'model' => 'Color LaserJet Pro MFP M479fdw', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Xerox', 'model' => 'VersaLink C405', 'is_color' => true, 'type' => 'mfp'],
            ['brand' => 'Brother', 'model' => 'HL-L8360CDW', 'is_color' => true, 'type' => 'laser'],
            ['brand' => 'Ricoh', 'model' => 'SP 5300DN', 'is_color' => false, 'type' => 'laser'],
        ];

        $printers = [];
        $count = rand(2, 4);

        for ($i = 0; $i < $count; $i++) {
            $m = $models[array_rand($models)];
            $printers[] = [
                'location_id' => $locationId,
                'agent_id' => $agentId,
                'name' => $m['model'] . ' - ' . ($i + 1),
                'brand' => $m['brand'],
                'model' => $m['model'],
                'serial_number' => strtoupper(Str::random(10)),
                'ip_address' => "192.168.1." . rand(10, 250),
                'status' => 'active',
                'is_color' => $m['is_color'],
                'printer_type' => $m['type'],
                'last_seen_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        return $printers;
    }

    private function seedPrinterData(int $printerId): void
    {
        $printer = DB::table('printers')->find($printerId);
        $isColor = (bool)$printer->is_color;

        // --- CONTADORES (30 días) ---
        $pages = rand(5000, 20000);
        for ($i = 30; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $pages += rand(50, 200);
            $color = $isColor ? (int)($pages * 0.25) : 0;
            
            DB::table('printer_counters')->insert([
                'printer_id' => $printerId,
                'total_pages' => $pages,
                'bw_pages' => $pages - $color,
                'color_pages' => $color,
                'collected_at' => $date,
                'created_at' => $date,
                'updated_at' => $date,
            ]);
        }

        // --- SUMINISTROS (Normalizado) ---
        $supplyTypes = ['toner_black', 'drum_black', 'fusor', 'waste_box'];
        if ($isColor) {
            $supplyTypes = array_merge($supplyTypes, ['toner_cyan', 'toner_magenta', 'toner_yellow']);
        }

        foreach ($supplyTypes as $type) {
            $perc = rand(5, 100);
            $status = $perc < 10 ? 'critical' : ($perc < 25 ? 'low' : 'ok');

            DB::table('printer_supplies')->insert([
                'printer_id' => $printerId,
                'supply_type' => $type,
                'percentage' => $perc,
                'status' => $status,
                'read_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            // Historial corto de suministros
            DB::table('printer_supplies')->insert([
                'printer_id' => $printerId,
                'supply_type' => $type,
                'percentage' => min(100, $perc + 5),
                'status' => 'ok',
                'read_at' => now()->subDays(2),
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ]);
        }

        // --- EVENTOS ---
        $this->seedAlerts($printerId);
    }

    private function seedAlerts(int $printerId): void
    {
        $criticals = DB::table('printer_supplies')
            ->where('printer_id', $printerId)
            ->where('percentage', '<', 20)
            ->where('read_at', '>', now()->subMinute())
            ->get();

        foreach ($criticals as $s) {
            DB::table('printer_events')->insert([
                'printer_id' => $printerId,
                'event_code' => strtoupper($s->supply_type) . '_LOW',
                'event_type' => 'supply_low',
                'severity' => $s->percentage < 7 ? 'critical' : 'warn',
                'supply_type' => $s->supply_type,
                'message' => "Atención: Nivel de {$s->supply_type} en {$s->percentage}%",
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}