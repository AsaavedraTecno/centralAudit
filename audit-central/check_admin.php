<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

$user = User::where('email','admin@admin.com')->with(['roles','tenantAssignments','assignedTenants'])->first();
if (!$user) {
    echo "No existe usuario admin@admin.com\n";
    exit(0);
}

echo "ID: {$user->id}\n";
echo "Name: {$user->name}\n";
echo "Email: {$user->email}\n";
echo "Active: " . ($user->active ? 'true' : 'false') . "\n";
$roleNames = $user->roles->pluck('name')->toArray();
echo "Roles: " . implode(', ', $roleNames) . "\n";

$tenantIds = $user->tenantAssignments->map(fn($t)=> $t->tenant_id)->toArray();
echo "Tenant assignments (ids): " . implode(', ', $tenantIds) . "\n";

$assigned = $user->assignedTenants->map(fn($t)=> $t->id . ':' . ($t->name ?? $t->code ?? ''))->toArray();
echo "Assigned tenants: " . implode(' | ', $assigned) . "\n";
