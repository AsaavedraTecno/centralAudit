<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';

// Simular peticiones y verificar permisos
$users = [
    ['email' => 'admin@admin.com', 'password' => 'T1cn2d3t4s0'],
    ['email' => 'tecnico@tecnodatasa.cl', 'password' => 'Tecnico123!'],
    ['email' => 'ventas@tecnodatasa.cl', 'password' => 'Ventas123!'],
];

$endpoints = [
    'GET /api/admin/users' => 'ver_usuarios',
    'POST /api/admin/users' => 'crear_usuarios',
    'GET /api/admin/roles' => 'ver_roles',
    'POST /api/admin/roles' => 'crear_roles',
    'GET /api/admin/permissions' => 'ver_permisos',
];

echo "════════════════════════════════════════════════════════════\n";
echo "✅ PRUEBA PERMISSION MIDDLEWARE\n";
echo "════════════════════════════════════════════════════════════\n\n";

$db = $app->make('db');
$users = $db->table('users')->select('id', 'email')->get();

foreach ($users as $user) {
    $model = \App\Models\User::find($user->id);
    $roleName = $model->getRoleName();
    
    echo "👤 $user->email ($roleName)\n";
    echo str_repeat("─", 60) . "\n";
    
    $perms = $model->getPermissions()->pluck('name')->toArray();
    foreach ($endpoints as $endpoint => $requiredPerm) {
        $has = in_array($requiredPerm, $perms);
        $status = $has ? "✅ PERMITIDO" : "❌ DENEGADO";
        echo "  $endpoint → $status\n";
    }
    echo "\n";
}

echo "════════════════════════════════════════════════════════════\n";
echo "✅ PRUEBA COMPLETADA\n";
echo "════════════════════════════════════════════════════════════\n";
