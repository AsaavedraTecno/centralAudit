<?php

$credentials = [
    ['email' => 'admin@admin.com', 'password' => 'T1cn2d3t4s0'],
    ['email' => 'tecnico@tecnodatasa.cl', 'password' => 'Tecnico123!'],
    ['email' => 'ventas@tecnodatasa.cl', 'password' => 'Ventas123!'],
    ['email' => 'soporte@tecnodatasa.cl', 'password' => 'Soporte123!'],
];

foreach ($credentials as $cred) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://127.0.0.1:8000/api/login");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($cred));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $data = json_decode($response, true);
    curl_close($ch);
    
    echo "========================================\n";
    echo "Email: {$cred['email']}\n";
    if (isset($data['user'])) {
        echo "✅ Login exitoso\n";
        echo "   Rol: {$data['user']['role']}\n";
        echo "   Permisos: " . count($data['user']['permissions']) . "\n";
        echo "   Tenants: " . count($data['user']['tenants']) . "\n";
        echo "   Token: " . substr($data['token'], 0, 20) . "...\n";
    } else {
        echo "❌ Error: " . ($data['message'] ?? json_encode($data)) . "\n";
    }
}
