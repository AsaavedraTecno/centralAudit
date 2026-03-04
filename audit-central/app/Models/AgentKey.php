<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AgentKey extends Model
{
    protected $connection = 'pgsql';

    protected $fillable = [
        'tenant_id',
        'name',
        'location_id',  
        'key_hash',
        'active',
        'last_seen_at',
        'last_ip',
    ];

    protected $casts = [
        'active' => 'boolean',
        'last_seen_at' => 'datetime',
        'location_id'  => 'integer',
    ];

    protected $hidden = [
        'key_hash',
    ];

    /**
     * Tenant relacionado
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Generar una nueva key para un tenant
     * Retorna la key plana (solo se muestra una vez)
     */
    public static function generateForTenant(
        string $tenantId,
        string $name,
        ?int   $locationId = null
    ): array {
        $plainKey = 'ak_' . Str::random(32);

        $agentKey = self::create([
            'tenant_id'   => $tenantId,
            'name'        => $name,
            'location_id' => $locationId,
            'key_hash'    => hash('sha256', $plainKey),
            'active'      => true,
        ]);

        return [
            'id'          => $agentKey->id,
            'name'        => $agentKey->name,
            'location_id' => $agentKey->location_id,
            'key'         => $plainKey, // Solo se retorna una vez
            'created_at'  => $agentKey->created_at,
        ];
    }

    /**
     * Verificar una key
     */
    public static function verify(string $plainKey, ?string $tenantId = null): ?self
    {
        $query = self::where('active', true);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        foreach ($query->get() as $key) {
            if (Hash::check($plainKey, $key->key_hash)) {
                $key->update([
                    'last_seen_at' => now(),
                    'last_ip'      => request()->ip(),
                ]);
                return $key;
            }
        }

        return null;
    }

    /**
     * Scope para keys activas
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Revocar key
     */
    public function revoke(): void
    {
        $this->update(['active' => false]);
    }
}
