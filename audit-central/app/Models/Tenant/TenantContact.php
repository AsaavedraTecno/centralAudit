<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantContact extends Model
{
    protected $table = 'contacts';

    protected $fillable = [
        'tipo',
        'nombre',
        'email',
        'telefono',
        'telefono_alternativo',
        'cargo',
        'departamento',
        'es_principal',
        'activo',
        'preferencia_contacto',
    ];

    protected $casts = [
        'es_principal' => 'boolean',
        'activo' => 'boolean',
    ];

    /**
     * Scope para contactos activos
     */
    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    /**
     * Scope para contactos por tipo
     */
    public function scopePorTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Scope para contacto principal
     */
    public function scopePrincipal($query)
    {
        return $query->where('es_principal', true)->first();
    }
}
