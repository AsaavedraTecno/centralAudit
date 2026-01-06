<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class AgentStatus extends Model
{
    protected $table = 'agent_status';

    protected $fillable = [
        'agent_id',
        'hostname',
        'ip_address',
        'version',
        'last_seen_at',
        'status',
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
}
