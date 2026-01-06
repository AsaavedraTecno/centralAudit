<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AgentKey extends Model
{
    protected $fillable = [
        'tenant_id',
        'name',
        'key_hash',
        'active',
        'last_seen_at',
        'last_ip',
    ];

    protected $casts = [
        'active' => 'boolean',
        'last_seen_at' => 'datetime',
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
    public static function generateForTenant(string $tenantId, string $name = 'Agente Principal'): array
    {
        // Generar key única: prefijo + uuid
        $plainKey = 'ak_' . Str::random(32);

        $agentKey = self::create([
            'tenant_id' => $tenantId,
            'name' => $name,
            'key_hash' => Hash::make($plainKey),
            'active' => true,
        ]);

        return [
            'id' => $agentKey->id,
            'name' => $agentKey->name,
            'key' => $plainKey, // Solo se retorna una vez
            'created_at' => $agentKey->created_at,
        ];
    }

    /**
     * Verificar una key
     */
    public static function verify(string $tenantCode, string $plainKey): ?self
    {
        $tenant = Tenant::where('code', $tenantCode)->first();
        
        if (!$tenant) {
            return null;
        }

        $keys = self::where('tenant_id', $tenant->id)
            ->where('active', true)
            ->get();

        foreach ($keys as $key) {
            if (Hash::check($plainKey, $key->key_hash)) {
                // Actualizar último uso
                $key->update([
                    'last_seen_at' => now(),
                    'last_ip' => request()->ip(),
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
