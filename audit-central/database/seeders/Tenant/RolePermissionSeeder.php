<?php

namespace Database\Seeders\Tenant;

use App\Models\Tenant\Permission;
use App\Models\Tenant\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Crear Permisos
        $permissions = [
            // Printers
            ['name' => 'view_printers', 'description' => 'Ver impresoras'],
            ['name' => 'manage_printers', 'description' => 'Crear, editar, eliminar impresoras'],
            
            // Alerts
            ['name' => 'view_alerts', 'description' => 'Ver alertas'],
            ['name' => 'manage_alerts', 'description' => 'Cerrar, resolver alertas'],
            
            // Users
            ['name' => 'view_users', 'description' => 'Ver usuarios del tenant'],
            ['name' => 'manage_users', 'description' => 'Crear, editar, eliminar usuarios'],
            ['name' => 'manage_roles', 'description' => 'Asignar roles a usuarios'],
            
            // Settings
            ['name' => 'view_settings', 'description' => 'Ver configuración del tenant'],
            ['name' => 'manage_settings', 'description' => 'Editar configuración del tenant'],
            
            // Reports
            ['name' => 'view_reports', 'description' => 'Ver reportes'],
            ['name' => 'export_reports', 'description' => 'Exportar reportes'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                ['description' => $permission['description']]
            );
        }

        // Crear Roles
        $admin = Role::firstOrCreate(['name' => 'admin'], [
            'description' => 'Administrador del tenant - Acceso completo'
        ]);

        $tecnico = Role::firstOrCreate(['name' => 'tecnico'], [
            'description' => 'Técnico - Gestión de impresoras y alertas'
        ]);

        $viewer = Role::firstOrCreate(['name' => 'viewer'], [
            'description' => 'Viewer - Solo lectura'
        ]);

        // Asignar Permisos a Roles
        // Admin: todos los permisos
        $admin->permissions()->sync(
            Permission::pluck('id')->toArray()
        );

        // Técnico: ver y gestionar impresoras, ver y gestionar alertas, ver reportes
        $tecnico->permissions()->sync(
            Permission::whereIn('name', [
                'view_printers',
                'manage_printers',
                'view_alerts',
                'manage_alerts',
                'view_reports',
                'export_reports',
                'view_settings',
            ])->pluck('id')->toArray()
        );

        // Viewer: solo lectura
        $viewer->permissions()->sync(
            Permission::whereIn('name', [
                'view_printers',
                'view_alerts',
                'view_reports',
                'view_settings',
            ])->pluck('id')->toArray()
        );

        echo "✅ Roles y permisos creados\n";
    }
}
