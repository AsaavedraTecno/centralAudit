<?php

require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

echo "════════════════════════════════════════════════\n";
echo "👤 VERIFICAR USUARIOS Y ROLES\n";
echo "════════════════════════════════════════════════\n\n";

$users = User::with('roles')->get();

foreach ($users as $user) {
    $roles = $user->roles->pluck('name')->join(', ') ?: 'Sin rol';
    echo "Usuario: {$user->name}\n";
    echo "  Email: {$user->email}\n";
    echo "  Roles: {$roles}\n";
    echo "\n";
}

echo "════════════════════════════════════════════════\n";
