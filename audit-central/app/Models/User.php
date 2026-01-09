<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Roles de BD CENTRAL (RBAC completo)
     * Retorna todos los roles del usuario (normalmente 1, pero soporta múltiples)
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'user_role');
    }

    /**
     * Obter el rol actual del usuario (el primero)
     */
    public function getRole(): ?Role
    {
        return $this->roles()->first();
    }

    /**
     * Obter nombre del rol actual
     */
    public function getRoleName(): ?string
    {
        return $this->getRole()?->name;
    }

    /**
     * Verificar si tiene un permiso específico
     */
    public function hasPermission(string $permissionName): bool
    {
        return $this->roles()
            ->whereHas('permissions', function ($query) use ($permissionName) {
                $query->where('name', $permissionName);
            })
            ->exists();
    }

    /**
     * Tenants asignados a este usuario con su scope de acceso
     */
    public function tenantAssignments()
    {
        return $this->hasMany(UserTenantAssignment::class);
    }

    /**
     * Tenants a los que tiene acceso
     */
    public function assignedTenants()
    {
        return $this->hasManyThrough(
            Tenant::class,
            UserTenantAssignment::class,
            'user_id',
            'id',
            'id',
            'tenant_id'
        );
    }

    /**
     * Alias para assignedTenants (para compatibilidad)
     */
    public function tenants()
    {
        return $this->assignedTenants();
    }

    /**
     * ¿Es admin? (verifica si tiene rol admin)
     */
    public function isAdmin(): bool
    {
        return $this->roles()->where('name', 'admin')->exists();
    }

    /**
     * ¿Es superadmin?
     */
    public function isSuperAdmin(): bool
    {
        return $this->roles()->where('name', 'superadmin')->exists();
    }

    /**
     * Obtener permisos del usuario actual
     */
    public function getPermissions()
    {
        return $this->roles()
            ->with('permissions')
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->unique('id');
    }
}
