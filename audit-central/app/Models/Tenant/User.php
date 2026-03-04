<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $table = 'users';
    
    // Configuración para UUID
    protected $keyType = 'string';
    public $incrementing = false;

    protected $connection = 'tenant'; //  Esto obliga a usar la conexión de Tenancy

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',   // <--- Agregado: para que User::create funcione en el Job
        'active', // <--- Agregado: para permitir asignación masiva
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'active' => 'boolean',
        'last_login_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // --- LOGICA SIMPLIFICADA ---

    /**
     * Como el rol ahora es un campo de texto, 
     * simplemente comparamos el valor de la columna.
     */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /**
     * Si necesitas verificar permisos en el futuro, 
     * puedes mapearlos según el rol único aquí.
     */
    public function hasPermission(string $permission): bool
    {
        // Ejemplo: si el rol es viewer, solo tiene permisos de 'view'
        if ($this->role === 'viewer' && str_starts_with($permission, 'view_')) {
            return true;
        }
        return false;
    }

    public function recordLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}