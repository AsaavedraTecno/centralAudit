<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    // Roles disponibles
    public const ROLE_SUPERADMIN = 'superadmin';
    public const ROLE_TENANT_ADMIN = 'tenant_admin';
    public const ROLE_SOPORTE = 'soporte';
    public const ROLE_FINANZAS = 'finanzas';
    public const ROLE_ANALISTA = 'analista';
    public const ROLE_CLIENTE = 'cliente';
    public const ROLE_VIEWER = 'viewer';

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'active',
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
            'active' => 'boolean',
        ];
    }

    /**
     * Tenants a los que tiene acceso (para usuarios NO superadmin)
     */
    public function tenants()
    {
        return $this->belongsToMany(Tenant::class, 'user_tenant')
                    ->withTimestamps();
    }

    /**
     * ¿Es superadmin? Ve todos los clientes
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPERADMIN;
    }

    /**
     * ¿Puede gestionar (CRUD) clientes?
     */
    public function canManage(): bool
    {
        return in_array($this->role, [
            self::ROLE_SUPERADMIN,
            self::ROLE_TENANT_ADMIN,
        ]);
    }

    /**
     * ¿Puede exportar reportes?
     */
    public function canExport(): bool
    {
        return in_array($this->role, [
            self::ROLE_SUPERADMIN,
            self::ROLE_TENANT_ADMIN,
            self::ROLE_FINANZAS,
            self::ROLE_ANALISTA,
        ]);
    }

    /**
     * ¿Puede configurar impresoras?
     */
    public function canConfigurePrinters(): bool
    {
        return in_array($this->role, [
            self::ROLE_SUPERADMIN,
            self::ROLE_TENANT_ADMIN,
            self::ROLE_SOPORTE,
        ]);
    }
}
