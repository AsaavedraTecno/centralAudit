<?php

namespace App\Http\Middleware;

use Stancl\Tenancy\Database\Models\Domain;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Facades\Tenancy;

class ResolveTenantFromDomain
{
    public function handle(Request $request, Closure $next)
    {
        $host = $request->getHost();

        // 1. Si viene header X-Tenant-Code (Para API/Postman) - prioridad para pruebas locales
        if ($request->hasHeader('X-Tenant-Code')) {
            $tenantId = $request->header('X-Tenant-Code');

            // Si el valor parece un UUID, intentar buscar por id
            if (preg_match('/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/', $tenantId)) {
                $tenant = Tenant::find($tenantId);

            // Si se pasó un dominio completo (contiene un punto), resolver por Domain
            } elseif (str_contains($tenantId, '.')) {
                $domainRecord = Domain::where('domain', $tenantId)->first();
                $tenant = $domainRecord?->tenant ?? null;

            // Si no es UUID ni dominio, buscar por code (slug)
            } else {
                $tenant = Tenant::where('code', $tenantId)->first();
            }

            if ($tenant && $tenant->status === 'active') {
                Tenancy::initialize($tenant);
                return $next($request);
            }

            return response()->json(['error' => 'Tenant no encontrado o inactivo'], 404);
        }

        // 2. Si es un dominio central, saltar la inicialización de tenant
        $centralDomains = config('tenancy.central_domains');
        if (in_array($host, $centralDomains)) {
            return $next($request);
        }

        // 3. Buscar el dominio en la tabla 'domains' de la BD Central
        // Usamos where('domain', $host) en lugar de resolveByHost
        $domainRecord = Domain::where('domain', $host)->first();

        if ($domainRecord) {
            $tenant = $domainRecord->tenant;

            if ($tenant && $tenant->status === 'active') {
                Tenancy::initialize($tenant);
                return $next($request);
            }
            
            return response()->json(['error' => 'Tenant inactivo o suspendido'], 403);
        }

        // 4. Si llegamos aquí, el dominio no está autorizado
        return response()->json(['error' => 'Dominio no autorizado: ' . $host], 404);
    }
}