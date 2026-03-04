<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'nombre',
        'direccion',
        'comuna',
        'region',
        'nombre_contacto',
        'email_contacto',
        'telefono_contacto',
        'telefono_alternativo',
        'comentarios',
        'activo'
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Impresoras de esta sucursal
     */
    public function printers(): HasMany
    {
        return $this->hasMany(Printer::class);
    }

    /**
     * Scope para sucursales activas
     */
    public function scopeActive($query)
    {
        return $query->where('activo', true);
    }

    // Una sucursal tiene muchos agentes instalados
    public function agents(): HasMany
    {
        return $this->hasMany(Agent::class);
    }
}
