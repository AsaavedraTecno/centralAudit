<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Role;

$email = 'admin@admin.com';
$roleName = 'admin';

$user = User::where('email', $email)->first();
if (!$user) {
    echo "Usuario $email no encontrado\n";
    exit(1);
}

$role = Role::where('name', $roleName)->first();
if (!$role) {
    echo "Rol '$roleName' no existe. Creando...\n";
    $role = Role::create(['name' => $roleName, 'label' => ucfirst($roleName)]);
}

// Asignar sin duplicados
$user->roles()->syncWithoutDetaching([$role->id]);

echo "Rol '{$role->name}' asignado al usuario {$user->email} (ID {$user->id})\n";
