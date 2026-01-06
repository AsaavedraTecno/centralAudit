<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'contact_name',
        'contact_phone',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
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
        return $query->where('active', true);
    }
}
