<?php

require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

echo "════════════════════════════════════════════════\n";
echo "👤 CREADOR DE USUARIO CENTRAL\n";
echo "════════════════════════════════════════════════\n\n";

try {
    // Verificar si el usuario ya existe
    $existingUser = User::where('email', 'admin@admin.com')->first();
    
    if ($existingUser) {
        echo "❌ El usuario admin@admin.com ya existe\n";
        echo "   ID: {$existingUser->id}\n";
        echo "   Nombre: {$existingUser->name}\n";
        echo "\n¿Deseas actualizar la contraseña? (s/n): ";
        $input = trim(fgets(STDIN));
        
        if (strtolower($input) === 's') {
            $existingUser->password = Hash::make('T1cn2d3t4s0');
            $existingUser->save();
            echo "✅ Contraseña actualizada\n";
        }
        exit(0);
    }
    
    // Crear nuevo usuario
    $user = User::create([
        'name' => 'Administrador',
        'email' => 'admin@admin.com',
        'password' => Hash::make('T1cn2d3t4s0'),
        'email_verified_at' => now(),
    ]);
    
    echo "✅ Usuario creado exitosamente\n\n";
    echo "════════════════════════════════════════════════\n";
    echo "📋 DATOS DE ACCESO\n";
    echo "════════════════════════════════════════════════\n";
    echo "Email:     admin@admin.com\n";
    echo "Password:  T1cn2d3t4s0\n";
    echo "Nombre:    Administrador\n";
    echo "ID:        {$user->id}\n";
    echo "════════════════════════════════════════════════\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
