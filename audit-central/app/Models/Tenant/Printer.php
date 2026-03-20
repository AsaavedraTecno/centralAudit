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
        'internal_id',
        'secondary_serial',
        'custom_location',
        'comments',
        'custom_field_1',
        'custom_field_2',
        'agent_id',
        'asset_tag',
        'location_id',
        'name',
        'description',
        'model',
        'brand',
        'serial_number',
        'status',
        'ip_address',
        'location',
        'mac_address',
        'hostname',
        'firmware_version',
        'is_color',
        'is_duplex',
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
        //return $this->hasMany(PrinterSupply::class);
        return $this->hasMany(PrinterSupply::class, 'printer_id', 'id');
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

    // Para saber qué agente la monitorea
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    // Para saber en qué sucursal está sin pasar por el agente
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function firstCounterToday()
    {
        return $this->hasOne(PrinterCounter::class)
                    ->where('collected_at', '>=', now()->startOfDay())
                    ->orderBy('collected_at', 'asc');
    }

    public function firstCounterThisMonth()
    {
        return $this->hasOne(PrinterCounter::class) 
                    ->where('collected_at', '>=', now()->startOfMonth())
                    ->orderBy('collected_at', 'asc');
    }

    public function lastCounterYesterday()
    {
        return $this->hasOne(PrinterCounter::class)
                    ->where('collected_at', '<', now()->startOfDay())
                    ->orderBy('collected_at', 'desc'); // La última lectura antes de hoy
    }


    public function dailyAggregateToday(): HasOne
    {
        return $this->hasOne(DailyAggregate::class)
            ->whereDate('date', now()->toDateString());
    }

    public function monthlyAggregateCurrent(): HasOne
    {
        return $this->hasOne(MonthlyAggregate::class)
            ->whereDate('month', now()->startOfMonth());
    }
    
}
