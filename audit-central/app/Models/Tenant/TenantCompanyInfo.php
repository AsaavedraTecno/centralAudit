<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantCompanyInfo extends Model
{
    protected $table = 'company_info';

    protected $fillable = [
        'rut',
        'razon_social',
        'direccion',
        'numero',
        'depto',
        'comuna',
        'ciudad',
        'region',
        'codigo_postal',
        'pais',
        'giro',
        'website',
        'logo_url',
    ];

    /**
     * Dirección completa formateada
     */
    public function getFullAddressAttribute(): string
    {
        return collect([
            $this->direccion,
            $this->numero,
            $this->depto,
            $this->comuna,
            $this->ciudad,
            $this->region,
            $this->codigo_postal,
        ])->filter()->join(', ');
    }
}
