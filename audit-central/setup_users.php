<?php

require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

echo "════════════════════════════════════════════════\n";
echo "🔐 SETUP: Asignar roles a usuarios centrales\n";
echo "════════════════════════════════════════════════\n\n";

// 1. Asignar admin@admin.com → admin
$admin = User::where('email', 'admin@admin.com')->first();
if ($admin) {
    $adminRole = Role::where('name', 'admin')->first();
    $admin->roles()->sync([$adminRole->id]);
    echo "✅ admin@admin.com → Rol: admin\n";
} else {
    echo "❌ admin@admin.com no encontrado\n";
}

// 2. Crear usuario técnico
echo "\n📝 Creando usuario técnico...\n";
$tecnicoPass = 'Tecnico123!';
$tecnico = User::updateOrCreate(
    ['email' => 'tecnico@tecnodatasa.cl'],
    [
        'name' => 'Técnico',
        'password' => Hash::make($tecnicoPass),
        'email_verified_at' => now(),
    ]
);
$tecnicoRole = Role::where('name', 'tecnico')->first();
$tecnico->roles()->sync([$tecnicoRole->id]);
echo "✅ tecnico@tecnodatasa.cl creado\n";
echo "   Contraseña: $tecnicoPass\n";

// 3. Crear usuario ventas
echo "\n📝 Creando usuario ventas...\n";
$ventasPass = 'Ventas123!';
$ventas = User::updateOrCreate(
    ['email' => 'ventas@tecnodatasa.cl'],
    [
        'name' => 'Ventas',
        'password' => Hash::make($ventasPass),
        'email_verified_at' => now(),
    ]
);
$ventasRole = Role::where('name', 'ventas')->first();
$ventas->roles()->sync([$ventasRole->id]);
echo "✅ ventas@tecnodatasa.cl creado\n";
echo "   Contraseña: $ventasPass\n";

// 4. Crear usuario soporte
echo "\n📝 Creando usuario soporte...\n";
$soportePass = 'Soporte123!';
$soporte = User::updateOrCreate(
    ['email' => 'soporte@tecnodatasa.cl'],
    [
        'name' => 'Soporte',
        'password' => Hash::make($soportePass),
        'email_verified_at' => now(),
    ]
);
$soporteRole = Role::where('name', 'soporte')->first();
$soporte->roles()->sync([$soporteRole->id]);
echo "✅ soporte@tecnodatasa.cl creado\n";
echo "   Contraseña: $soportePass\n";

// 5. Asignar clientes a usuarios
echo "\n📝 Asignando clientes a usuarios...\n";
$tenants = \App\Models\Tenant::all();
foreach ($tenants as $tenant) {
    // Técnico: acceso read a todos
    $tecnico->tenantAssignments()->updateOrCreate(
        ['tenant_id' => $tenant->id],
        ['scope' => 'read']
    );
    
    // Ventas: acceso full a todos
    $ventas->tenantAssignments()->updateOrCreate(
        ['tenant_id' => $tenant->id],
        ['scope' => 'full']
    );
    
    // Soporte: acceso support a todos
    $soporte->tenantAssignments()->updateOrCreate(
        ['tenant_id' => $tenant->id],
        ['scope' => 'support']
    );
}
echo "✅ Clientes asignados a usuarios\n";

echo "\n════════════════════════════════════════════════\n";
echo "✅ SETUP COMPLETADO\n";
echo "════════════════════════════════════════════════\n";
echo "\n📋 USUARIOS PARA PROBAR:\n";
echo "────────────────────────────────────────────────\n";
echo "Admin:     admin@admin.com / T1cn2d3t4s0\n";
echo "Técnico:   tecnico@tecnodatasa.cl / Tecnico123!\n";
echo "Ventas:    ventas@tecnodatasa.cl / Ventas123!\n";
echo "Soporte:   soporte@tecnodatasa.cl / Soporte123!\n";
echo "════════════════════════════════════════════════\n";
