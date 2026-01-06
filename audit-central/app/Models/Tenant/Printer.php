<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Printer extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'location_id',
        'name',
        'description',
        'model',
        'brand',
        'serial_number',
        'status',
        'client_code',
        'ip_address',
        'location',
        'mac_address',
        'hostname',
        'firmware_version',
        'asset_tag',
        'is_color',
        'is_duplex',
        'is_networked',
        'printer_type',
        'last_seen_at',
        'last_counter_at',
        'notes',
    ];

    protected $casts = [
        'is_color' => 'boolean',
        'is_duplex' => 'boolean',
        'is_networked' => 'boolean',
        'last_seen_at' => 'datetime',
        'last_counter_at' => 'datetime',
    ];

    /**
     * Sucursal a la que pertenece
     */
    public function locationRelation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    /**
     * Historial de contadores
     */
    public function counters(): HasMany
    {
        return $this->hasMany(PrinterCounter::class);
    }

    /**
     * Historial de supplies
     */
    public function supplies(): HasMany
    {
        return $this->hasMany(PrinterSupply::class);
    }

    /**
     * Alertas de esta impresora
     */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    /**
     * Último registro de contadores
     */
    public function latestCounter(): HasOne
    {
        return $this->hasOne(PrinterCounter::class)->latestOfMany('collected_at');
    }

    /**
     * Último registro de supplies
     */
    public function latestSupply(): HasOne
    {
        return $this->hasOne(PrinterSupply::class)->latestOfMany('read_at');
    }

    /**
     * Alertas activas (no resueltas)
     */
    public function activeAlerts(): HasMany
    {
        return $this->hasMany(Alert::class)->whereNull('cleared_at');
    }

    /**
     * Scope para impresoras activas
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Verificar si es impresora color
     */
    public function isColor(): bool
    {
        return $this->is_color ?? false;
    }
}
