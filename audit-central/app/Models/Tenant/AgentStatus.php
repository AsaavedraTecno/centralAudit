<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class AgentStatus extends Model
{
    protected $table = 'agent_status';

    protected $fillable = [
        'agent_id',
        'location_id',
        'hostname',
        'ip_address',
        'version',
        'last_seen_at',
        'status',
        'snmp_community'
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function scopeOnline($query)
    {
        return $query->where('status', 'online');
    }

    public function scopeOffline($query)
    {
        return $query->where('status', 'offline');
    }

    public function isOnline(): bool
    {
        return $this->status === 'online';
    }

    public function recordHeartbeat(string $ip, string $version): void
    {
        $this->update([
            'last_seen_at' => now(),
            'ip_address' => $ip,
            'version' => $version,
            'status' => 'online',
            
        ]);
    }

    // El agente pertenece a una sucursal específica
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    // El agente tiene varios rangos de IP para escanear (la lista que vimos)
    public function scanRanges(): HasMany
    {
        return $this->hasMany(AgentScanRange::class);
    }

    // El agente es responsable de muchas impresoras encontradas
    public function printers(): HasMany
    {
        return $this->hasMany(Printer::class);
    }
}
