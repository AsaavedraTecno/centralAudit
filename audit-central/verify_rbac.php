<?php

require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "════════════════════════════════════════════════\n";
echo "✅ VERIFICAR RBAC FUNCIONANDO\n";
echo "════════════════════════════════════════════════\n\n";

$users = User::with('roles')->get();

foreach ($users as $user) {
    $roleName = $user->getRoleName() ?? 'SIN ROL';
    $permissions = $user->getPermissions()->count();
    
    echo "👤 {$user->name} ({$user->email})\n";
    echo "   Rol: $roleName\n";
    echo "   Permisos: $permissions\n";
    echo "   Tenants asignados: " . $user->tenantAssignments()->count() . "\n";
    echo "\n";
}

echo "════════════════════════════════════════════════\n";
echo "✅ VERIFICACIÓN COMPLETA\n";
echo "════════════════════════════════════════════════\n";
