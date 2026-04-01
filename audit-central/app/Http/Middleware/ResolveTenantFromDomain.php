<?php

namespace App\Http\Middleware;

use Stancl\Tenancy\Database\Models\Domain;
use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Facades\Tenancy;

class ResolveTenantFromDomain
{
    public function handle(Request $request, Closure $next)
    {
        $host = $request->getHost();

        // 1. Si es un dominio central, saltar la inicialización de tenant
        $centralDomains = config('tenancy.central_domains');
        if (in_array($host, $centralDomains)) {
            return $next($request);
        }

        // 2. Buscar el dominio en la tabla 'domains' de la BD Central
        $domainRecord = Domain::where('domain', $host)->first();

        if ($domainRecord) {
            $tenant = $domainRecord->tenant;

            if ($tenant && $tenant->status === 'active') {
                Tenancy::initialize($tenant);
                return $next($request);
            }
            
            return response()->json(['error' => 'Tenant inactivo o suspendido'], 403);
        }

        // 3. Si llegamos aquí, el dominio no está autorizado o no existe
        return response()->json(['error' => 'Dominio no autorizado: ' . $host], 404);
    }
}