<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantContact extends Model
{
    // Asegúrate de que los campos coincidan con tu migración de la DB central
    protected $table = 'contact_client';
    protected $fillable = [
        'tenant_id',
        'nombre',
        'email',
        'telefono',
        'telefono_alternativo',
        'comentarios'
    ];

    /**
     * Relación con el Tenant (Central)
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}