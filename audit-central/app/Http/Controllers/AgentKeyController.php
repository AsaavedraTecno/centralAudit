<?php

namespace App\Http\Controllers;

use App\Models\AgentKey;
use App\Models\Tenant;
use App\Models\Tenant\AgentStatus;
use App\Models\Tenant\AgentScanRange;
use App\Models\Tenant\Location;
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AgentKeyController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Listar keys con sucursal asociada.
     * GET /api/clients/{code}/agent-keys
     */
    public function index(Request $request, string $code): JsonResponse
    {
        // 1. Validar Admin
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        // 2. Obtener Tenant (DB Central)
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $search = $request->query('search');

        // 3. Obtener Keys (DB Central)
        $keys = AgentKey::where('tenant_id', $tenant->id)
            ->when($search, function ($query, $search) {
                // Buscamos por nombre de la sucursal O por el final de la llave
                $query->where('name', 'ILIKE', "%{$search}%")
                      ->orWhere('masked_key', 'ILIKE', "%{$search}%");
            })
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'location_id', 'active', 'masked_key', 'last_seen_at', 'last_ip', 'created_at']);

        // 4. Resolver nombres de sucursales (DB Tenant)
        // Recolectamos los IDs de locations para hacer una sola consulta al tenant
        $locationIds = $keys->pluck('location_id')->filter()->unique()->values()->toArray();
        $locationNames = [];

        if (!empty($locationIds)) {
            // Entramos al contexto del tenant SOLO para leer locations
            $this->tenantContext->run($tenant, function () use ($locationIds, &$locationNames) {
                Location::whereIn('id', $locationIds)
                    ->get(['id', 'nombre', 'comuna', 'region'])
                    ->each(function ($loc) use (&$locationNames) {
                        $locationNames[$loc->id] = [
                            'nombre' => $loc->nombre,
                            'comuna' => $loc->comuna,
                            'region' => $loc->region,
                        ];
                    });
            });
        }

        // 5. Mapear resultados combinando datos Centrales y del Tenant
        $result = $keys->map(function ($key) use ($locationNames) {
            $data = $key->toArray();
            $data['sucursal'] = $key->location_id
                ? ($locationNames[$key->location_id] ?? null)
                : null;
            return $data;
        });

        return response()->json(['agent_keys' => $result]);
    }

    /**
     * Crear nueva key con sucursal y configuración de red.
     * POST /api/clients/{code}/agent-keys
     */
    public function store(Request $request, string $code): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            // Opcional: ID de sucursal existente
            'location_id' => 'nullable|integer',
            // Opcional: Datos para crear NUEVA sucursal
            'sucursal_nombre'            => 'required_without:location_id|string|max:255',
            'sucursal_direccion'         => 'required_without:location_id|string|max:255',
            'sucursal_nombre_contacto'   => 'nullable|string|max:255',
            'sucursal_email_contacto'    => 'nullable|email|max:255',
            'sucursal_telefono_contacto' => 'nullable|string|max:50',
            // Red
            'snmp_community' => 'required|string|max:100',
            'ip_from'        => 'required|string',
            'ip_to'          => 'required|string',
            'subnet_mask'    => 'required|string',
        ]);

        try {
            $locationId = $validated['location_id'] ?? null;

            // PASO 1: Si no hay location_id, creamos la sucursal (Contexto: Tenant)
            if (!$locationId) {
                // Usamos &$locationId para poder modificar la variable externa desde dentro del closure
                $this->tenantContext->run($tenant, function () use ($validated, &$locationId) {
                    $location = Location::create([
                        'nombre'            => $validated['sucursal_nombre'],
                        'direccion'         => $validated['sucursal_direccion'],
                        'nombre_contacto'   => $validated['sucursal_nombre_contacto'] ?? null,
                        'email_contacto'    => $validated['sucursal_email_contacto'] ?? null,
                        'telefono_contacto' => $validated['sucursal_telefono_contacto'] ?? null,
                        'activo'            => true,
                    ]);
                    $locationId = $location->id;
                });
            }

            // PASO 2: Crear la AgentKey (Contexto: Central)
            // Aquí ya tenemos $locationId seguro, sea nuevo o existente
            $keyData = AgentKey::generateForTenant(
                $tenant->id,
                $validated['name'],
                $locationId
            );

            // PASO 3: Crear infraestructura del agente (Contexto: Tenant)
            $this->tenantContext->run($tenant, function () use ($keyData, $locationId, $validated) {
                // Estado inicial
                $agent = AgentStatus::create([
                    'agent_id'       => (string) $keyData['id'],
                    'location_id'    => $locationId,
                    'hostname'       => 'ESPERANDO INSTALACIÓN',
                    'status'         => 'offline',
                    'snmp_community' => $validated['snmp_community'],
                    'last_seen_at'   => now(),
                ]);

                // Rango de escaneo
                AgentScanRange::create([
                    'agent_id'    => $agent->id,
                    'ip_from'     => $validated['ip_from'],
                    'ip_to'       => $validated['ip_to'],
                    'subnet_mask' => $validated['subnet_mask'],
                    'active'      => true,
                ]);
            });

            return response()->json([
                'message'   => 'Agente creado. Guarda la key, no se mostrará de nuevo.',
                'agent_key' => $keyData, // Esto devuelve ['id' => X, 'key' => 'ak_...']
            ], 201);

        } catch (\Exception $e) {
            Log::error("Error creando agent key para {$code}: " . $e->getMessage());
            return response()->json([
                'error'   => 'No se pudo crear el agente.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Revocar key.
     * DELETE /api/clients/{code}/agent-keys/{id}
     */
    public function destroy(Request $request, string $code, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        // AgentKey vive en la DB Central, no necesitamos tenantContext->run()
        $key = AgentKey::where('id', $id)->where('tenant_id', $tenant->id)->first();
        if (!$key) {
            return response()->json(['error' => 'Key no encontrada'], 404);
        }

        $key->revoke(); // Asegúrate de tener este método en tu modelo o usa ->update(['active'=>false])

        return response()->json(['message' => 'Key revocada exitosamente']);
    }

    /**
     * Reactivar key.
     * PATCH /api/clients/{code}/agent-keys/{id}/activate
     */
    public function activate(Request $request, string $code, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $key = AgentKey::where('id', $id)->where('tenant_id', $tenant->id)->first();
        if (!$key) {
            return response()->json(['error' => 'Key no encontrada'], 404);
        }

        $key->update(['active' => true]);

        return response()->json(['message' => 'Key activada exitosamente']);
    }
}