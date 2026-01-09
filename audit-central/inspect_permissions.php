<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Permission;
use App\Models\Role;

$perms = Permission::all();
echo "Permissions (count: " . $perms->count() . "):\n";
foreach ($perms as $p) {
    echo " - {$p->id}: {$p->name} ({$p->category})\n";
}

$role = Role::where('name','admin')->with('permissions')->first();
if (!$role) {
    echo "No existe rol admin\n";
    exit(0);
}

echo "\nRole admin permissions (count: " . $role->permissions->count() . "):\n";
foreach ($role->permissions as $p) {
    echo " - {$p->id}: {$p->name}\n";
}
