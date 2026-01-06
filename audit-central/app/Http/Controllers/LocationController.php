<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Location;
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Lista sucursales de un cliente
     * GET /api/clients/{code}/sucursales
     */
    public function index(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $locations = $this->tenantContext->run($tenant, function () {
            return Location::active()
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'address', 'city', 'contact_name', 'contact_phone']);
        });

        return response()->json([
            'sucursales' => $locations,
        ]);
    }

    /**
     * Detalle de una sucursal
     * GET /api/clients/{code}/sucursales/{id}
     */
    public function show(Request $request, string $code, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $location = $this->tenantContext->run($tenant, function () use ($id) {
            return Location::with(['printers' => function ($query) {
                $query->select('id', 'location_id', 'name', 'model', 'brand', 'serial_number', 'ip_address', 'status');
            }])->find($id);
        });

        if (!$location) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'sucursal' => $location,
        ]);
    }

    /**
     * Crear sucursal
     * POST /api/clients/{code}/sucursales
     */
    public function store(Request $request, string $code): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManage()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $user);

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:20',
        ]);

        $location = $this->tenantContext->run($tenant, function () use ($validated) {
            return Location::create([
                ...$validated,
                'active' => true,
            ]);
        });

        return response()->json([
            'message' => 'Sucursal creada exitosamente',
            'sucursal' => $location,
        ], 201);
    }

    /**
     * Actualizar sucursal
     * PUT /api/clients/{code}/sucursales/{id}
     */
    public function update(Request $request, string $code, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManage()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $user);

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'contact_name' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|max:20',
            'active' => 'sometimes|boolean',
        ]);

        $location = $this->tenantContext->run($tenant, function () use ($id, $validated) {
            $location = Location::find($id);
            
            if ($location) {
                $location->update($validated);
            }

            return $location;
        });

        if (!$location) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'message' => 'Sucursal actualizada',
            'sucursal' => $location->fresh(),
        ]);
    }

    /**
     * Eliminar/desactivar sucursal
     * DELETE /api/clients/{code}/sucursales/{id}
     */
    public function destroy(Request $request, string $code, int $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManage()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = $this->tenantContext->getTenantWithAccess($code, $user);

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $deleted = $this->tenantContext->run($tenant, function () use ($id) {
            $location = Location::find($id);
            
            if ($location) {
                // Soft delete: solo desactivar
                $location->update(['active' => false]);
                return true;
            }

            return false;
        });

        if (!$deleted) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'message' => 'Sucursal desactivada',
        ]);
    }
}
