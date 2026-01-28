<?php

namespace App\Services;

use App\Models\Tenant;
use Stancl\Tenancy\Tenancy;

/**
 * Servicio para manejar el contexto de tenant de forma segura.
 * Asegura que siempre se cierre el contexto después de usarlo.
 */
class TenantContextService
{
    private Tenancy $tenancy;
    private ?Tenant $currentTenant = null;

    public function __construct(Tenancy $tenancy)
    {
        $this->tenancy = $tenancy;
    }

    /**
     * Ejecuta un callback dentro del contexto de un tenant
     * 
     * @param Tenant $tenant
     * @param callable $callback
     * @return mixed
     */
    public function run(Tenant $tenant, callable $callback): mixed
    {
        try {
            $this->tenancy->initialize($tenant);
            $this->currentTenant = $tenant;
            
            return $callback($tenant);
        } finally {
            $this->tenancy->end();
            $this->currentTenant = null;
        }
    }

    /**
     * Ejecuta un callback para un tenant por código
     * 
     * @param string $code
     * @param callable $callback
     * @return mixed
     * @throws \Exception si el tenant no existe
     */
    public function runByCode(string $code, callable $callback): mixed
    {
        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            throw new \Exception("Tenant con código '{$code}' no encontrado");
        }

        return $this->run($tenant, $callback);
    }

    /**
     * Obtiene un tenant por código y verifica acceso del usuario
     * 
     * @param string $code
     * @param \App\Models\User $user
     * @return Tenant|null
     */
    public function getTenantWithAccess(string $code, $user): ?Tenant
    {
        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return null;
        }

        // Admin tiene acceso a todo
        if ($user->isAdmin()) {
            return $tenant;
        }

        // Verificar si el usuario está asignado al tenant
        $hasAccess = $user->tenants()->where('tenants.id', $tenant->id)->exists();

        return $hasAccess ? $tenant : null;
    }

    /**
     * Obtiene el tenant actual (si hay uno inicializado)
     */
    public function getCurrentTenant(): ?Tenant
    {
        return $this->currentTenant;
    }
}
