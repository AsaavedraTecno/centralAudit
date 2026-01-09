<?php

namespace App\Http\Controllers;

use App\Models\AgentKey;
use App\Models\Tenant;
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Lista de clientes según permisos del usuario
     * GET /api/clients
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $columns = ['id', 'code', 'name', 'status'];

        // Superadmin y Admin ven todos
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            $tenants = Tenant::query()
                ->orderBy('name')
                ->get($columns);
        } else {
            // Otros roles ven solo los asignados
            $tenantColumns = array_map(fn($c) => "tenants.{$c}", $columns);
            $tenants = $user->tenants()
                ->orderBy('name')
                ->get($tenantColumns);
        }

        return response()->json([
            'clients' => $tenants,
        ]);
    }

    /**
     * Detalle de un cliente
     * GET /api/clients/{code}
     */
    public function show(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        return response()->json([
            'client' => $tenant,
        ]);
    }

    /**
     * Crear nuevo cliente (solo superadmin)
     * POST /api/clients
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'rut' => 'required|string|max:12|unique:tenants,rut',
            'nombre' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:tenants,code|regex:/^[a-z0-9\-]+$/',
            'direccion' => 'nullable|string|max:255',
            'comuna' => 'nullable|string|max:100',
            'ciudad' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'contacto_nombre' => 'nullable|string|max:255',
            'contacto_email' => 'nullable|email|max:255',
            'contacto_telefono' => 'nullable|string|max:20',
            'ti_nombre' => 'nullable|string|max:255',
            'ti_email' => 'nullable|email|max:255',
            'ti_telefono' => 'nullable|string|max:20',
            'contrato_inicio' => 'nullable|date',
            'contrato_fin' => 'nullable|date',
        ]);

        DB::beginTransaction();

        try {
            // 1. Crear el tenant (Stancl automáticamente crea la BD)
            $tenant = Tenant::create([
                'id' => Str::uuid()->toString(),
                ...$validated,
                'status' => 'active',
            ]);

            // 2. Ejecutar migraciones del tenant
            Artisan::call('tenants:migrate', [
                '--tenants' => [$tenant->id],
            ]);

            // 3. Generar agent key
            $agentKeyData = AgentKey::generateForTenant($tenant->id, 'Agente Principal');

            DB::commit();

            Log::info("Cliente creado: {$tenant->code}", [
                'tenant_id' => $tenant->id,
                'agent_key_id' => $agentKeyData['id'],
            ]);

            return response()->json([
                'message' => 'Cliente creado exitosamente',
                'client' => $tenant,
                'agent_key' => $agentKeyData, // La key solo se muestra una vez
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error creando cliente: " . $e->getMessage());

            return response()->json([
                'error' => 'Error al crear el cliente',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Actualizar cliente (solo superadmin)
     * PUT /api/clients/{code}
     */
    public function update(Request $request, string $code): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'rut' => 'sometimes|string|max:12|unique:tenants,rut,' . $tenant->id,
            'nombre' => 'sometimes|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'comuna' => 'nullable|string|max:100',
            'ciudad' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'contacto_nombre' => 'nullable|string|max:255',
            'contacto_email' => 'nullable|email|max:255',
            'contacto_telefono' => 'nullable|string|max:20',
            'ti_nombre' => 'nullable|string|max:255',
            'ti_email' => 'nullable|email|max:255',
            'ti_telefono' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,suspended,ended',
            'contrato_inicio' => 'nullable|date',
            'contrato_fin' => 'nullable|date',
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Cliente actualizado',
            'client' => $tenant->fresh(),
        ]);
    }

    /**
     * Eliminar/suspender cliente (solo superadmin)
     * DELETE /api/clients/{code}
     */
    public function destroy(Request $request, string $code): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        // Soft delete: solo suspender (no eliminamos la BD)
        $tenant->update(['status' => 'ended']);

        return response()->json([
            'message' => 'Cliente desactivado',
        ]);
    }

    /**
     * Árbol completo: sucursales + impresoras del cliente
     * GET /api/clients/{code}/tree
     */
    public function tree(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $tree = $this->tenantContext->run($tenant, function () {
            $locations = \DB::table('locations')
                ->where('active', true)
                ->orderBy('name')
                ->get();

            return $locations->map(function ($location) {
                $printers = \DB::table('printers')
                    ->where('location_id', $location->id)
                    ->orderBy('name')
                    ->get(['id', 'name', 'model', 'serial_number', 'ip_address', 'status']);

                return [
                    'id' => $location->id,
                    'name' => $location->name,
                    'code' => $location->code,
                    'address' => $location->address,
                    'printers' => $printers,
                ];
            });
        });

        return response()->json([
            'client' => [
                'id' => $tenant->id,
                'rut' => $tenant->rut,
                'nombre' => $tenant->nombre,
                'code' => $tenant->code,
            ],
            'locations' => $tree,
        ]);
    }
}
