<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Crear Roles (usando updateOrCreate para evitar duplicados)
        $roleAdmin = Role::updateOrCreate(
            ['name' => 'admin'],
            ['description' => 'Administrador del sistema. Acceso total.']
        );

        $roleTecnico = Role::updateOrCreate(
            ['name' => 'tecnico'],
            ['description' => 'Técnico. Ve clientes asignados, puede editar limitado.']
        );

        $roleVentas = Role::updateOrCreate(
            ['name' => 'ventas'],
            ['description' => 'Ventas. Ve clientes asignados, gestiona contratos.']
        );

        $roleSoporte = Role::updateOrCreate(
            ['name' => 'soporte'],
            ['description' => 'Soporte. Solo lectura de clientes, atiende incidencias.']
        );

        // Crear Permisos
        $permisos = [
            // Clientes
            ['name' => 'ver_clientes', 'category' => 'clientes', 'description' => 'Ver lista de clientes'],
            ['name' => 'crear_cliente', 'category' => 'clientes', 'description' => 'Crear nuevo cliente'],
            ['name' => 'editar_cliente', 'category' => 'clientes', 'description' => 'Editar datos del cliente'],
            ['name' => 'eliminar_cliente', 'category' => 'clientes', 'description' => 'Eliminar cliente'],
            
            // Impresoras
            ['name' => 'ver_impresoras', 'category' => 'impresoras', 'description' => 'Ver impresoras del cliente'],
            ['name' => 'editar_impresoras', 'category' => 'impresoras', 'description' => 'Editar datos de impresoras'],
            
            // Usuarios
            ['name' => 'ver_usuarios', 'category' => 'usuarios', 'description' => 'Ver usuarios del cliente'],
            ['name' => 'crear_usuario', 'category' => 'usuarios', 'description' => 'Crear usuario en cliente'],
            ['name' => 'editar_usuario', 'category' => 'usuarios', 'description' => 'Editar usuario del cliente'],
            ['name' => 'eliminar_usuario', 'category' => 'usuarios', 'description' => 'Eliminar usuario del cliente'],
            
            // Reportes
            ['name' => 'ver_reportes', 'category' => 'reportes', 'description' => 'Ver reportes'],
            ['name' => 'exportar_reportes', 'category' => 'reportes', 'description' => 'Exportar reportes'],
            
            // Alertas
            ['name' => 'ver_alertas', 'category' => 'alertas', 'description' => 'Ver alertas'],
            ['name' => 'editar_alertas', 'category' => 'alertas', 'description' => 'Editar configuración de alertas'],
            
            // Roles y Permisos
            ['name' => 'ver_roles', 'category' => 'administracion', 'description' => 'Ver roles'],
            ['name' => 'crear_rol', 'category' => 'administracion', 'description' => 'Crear nuevo rol'],
            ['name' => 'editar_rol', 'category' => 'administracion', 'description' => 'Editar rol'],
            ['name' => 'eliminar_rol', 'category' => 'administracion', 'description' => 'Eliminar rol'],
            
            // Auditoría
            ['name' => 'ver_audit_logs', 'category' => 'auditoria', 'description' => 'Ver logs de auditoría'],
        ];

        $permisosPorId = [];
        foreach ($permisos as $permiso) {
            $p = Permission::updateOrCreate(
                ['name' => $permiso['name']],
                ['category' => $permiso['category'], 'description' => $permiso['description']]
            );
            $permisosPorId[$permiso['name']] = $p->id;
        }

        // Asignar Permisos a Roles

        // Admin: TODOS los permisos
        $roleAdmin->permissions()->sync(array_values($permisosPorId));

        // Técnico
        $roleTecnico->permissions()->sync([
            $permisosPorId['ver_clientes'],
            $permisosPorId['ver_impresoras'],
            $permisosPorId['editar_impresoras'],
            $permisosPorId['ver_usuarios'],
            $permisosPorId['ver_alertas'],
            $permisosPorId['editar_alertas'],
        ]);

        // Ventas
        $roleVentas->permissions()->sync([
            $permisosPorId['ver_clientes'],
            $permisosPorId['ver_reportes'],
        ]);

        // Soporte
        $roleSoporte->permissions()->sync([
            $permisosPorId['ver_clientes'],
            $permisosPorId['ver_impresoras'],
            $permisosPorId['ver_usuarios'],
            $permisosPorId['ver_alertas'],
            $permisosPorId['ver_reportes'],
        ]);
    }
}
