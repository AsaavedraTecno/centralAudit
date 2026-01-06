<?php

namespace App\Http\Middleware;

use App\Models\Domain;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Facades\Tenancy;

class ResolveTenantFromDomain
{
    /**
     * Resolver tenant desde dominio/subdominio
     * 
     * Soporta:
     * - empresa1.app.cl → tenant: empresa-abc
     * - custom.domain.com → tenant: empresa-def
     * - localhost:8000 → header X-Tenant-Code
     */
    public function handle(Request $request, Closure $next)
    {
        $host = $request->getHost();

        // 1. Si viene header X-Tenant-Code (para testing, API calls)
        if ($request->hasHeader('X-Tenant-Code')) {
            $tenantId = $request->header('X-Tenant-Code');
            $tenant = Tenant::where('id', $tenantId)->first();

            if (!$tenant || $tenant->status !== 'active') {
                return response()->json([
                    'error' => 'Tenant no encontrado o inactivo',
                ], 404);
            }

            Tenancy::initialize($tenant);
            $request->attributes->set('tenant', $tenant);
            return $next($request);
        }

        // 2. Buscar dominio en tabla domains (BD central)
        $domain = Domain::resolveByHost($host);

        if ($domain) {
            $tenant = $domain->tenant;

            if ($tenant->status !== 'active') {
                return response()->json([
                    'error' => 'Tenant suspendido',
                ], 403);
            }

            Tenancy::initialize($tenant);
            $request->attributes->set('tenant', $tenant);
            return $next($request);
        }

        // 3. Para localhost/127.0.0.1 en desarrollo: permitir sin tenant
        // (útil para testing)
        if (in_array($host, ['localhost', '127.0.0.1']) && 
            in_array(env('APP_ENV'), ['local', 'testing'])) {
            return $next($request);
        }

        // 4. Dominio no reconocido
        return response()->json([
            'error' => 'Dominio no autorizado',
        ], 404);
    }
}
