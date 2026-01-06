<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Domain extends Model
{
    protected $fillable = [
        'tenant_id',
        'domain',
        'type',
        'status',
        'ssl_certificate_expires_at',
    ];

    protected $casts = [
        'ssl_certificate_expires_at' => 'datetime',
    ];

    /**
     * Tenant al que pertenece este dominio
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope para dominios activos
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope para dominios principales
     */
    public function scopePrimary($query)
    {
        return $query->where('type', 'primary');
    }

    /**
     * Obtener un dominio por su URL (incluso inactivos)
     * Usado por middleware para resolver tenant
     * 
     * IMPORTANTE: Busca en BD central, no en tenant
     */
    public static function resolveByHost(string $host): ?self
    {
        // Remover puerto si existe
        $domain = explode(':', $host)[0];

        // Especificar que busque en la conexión central (pgsql)
        // NO filtrar por active aquí - déjalo al middleware decidir
        return self::on(config('tenancy.database.central_connection', 'pgsql'))
            ->where('domain', $domain)
            ->first();
    }

    /**
     * Crear dominio principal automáticamente al crear tenant
     */
    public static function createPrimaryForTenant(Tenant $tenant): self
    {
        $primaryDomain = strtolower($tenant->code) . '.app.cl';

        return self::create([
            'tenant_id' => $tenant->id,
            'domain' => $primaryDomain,
            'type' => 'primary',
            'status' => 'active',
        ]);
    }
}
