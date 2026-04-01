<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AgentKey extends Model
{
    protected $connection = 'pgsql';

    protected $fillable = [
        'tenant_id',
        'name',
        'location_id',  
        'key_hash',
        'masked_key',
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
     * Genera una llave "Voice Friendly" de 15 caracteres (sin O, 0, I, 1)
     * Formato: ABCDE-FGHJK-LMNPQ
     */
    public static function generateVoiceFriendlyKey(): string
    {
        $pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $key = '';

        for ($i = 0; $i < 15; $i++) {
            $key .= $pool[random_int(0, strlen($pool) - 1)];
        }

        return implode('-', str_split($key, 5));
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
        // Generar llave plana amigable (Ej: ABCDE-FGHJK-LMNPQ)
        $plainKey = self::generateVoiceFriendlyKey();

        // Crear la máscara (Tomamos los últimos 5 caracteres)
        $lastFive = substr($plainKey, -5);
        $maskedKey = "**********" . $lastFive;

        // 3. Crear el registro en la BD Central
        $agentKey = self::create([
            'tenant_id'   => $tenantId,
            'name'        => $name,
            'location_id' => $locationId,
            'key_hash'    => hash('sha256', $plainKey),
            'masked_key'  => $maskedKey, // Guardamos la máscara para búsqueda visual
            'active'      => true,
        ]);

        return [
            'id'          => $agentKey->id,
            'name'        => $agentKey->name,
            'location_id' => $agentKey->location_id,
            'key'         => $plainKey, // Esta es la que el admin copia
            'created_at'  => $agentKey->created_at,
        ];
    }

    /**
     * Verificar una key
     */
    public static function verify(string $plainKey, ?string $tenantId = null): ?self
    {
        //  Limpiamos la llave por si viene con espacios y forzamos mayúsculas
        $cleanKey = trim(strtoupper($plainKey));
        $hashedKey = hash('sha256', $cleanKey);

        $query = self::where('active', true)
                     ->where('key_hash', $hashedKey);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $key = $query->first();

        if ($key) {
            $key->update([
                'last_seen_at' => now(),
                'last_ip'      => request()->ip(),
            ]);
            return $key;
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