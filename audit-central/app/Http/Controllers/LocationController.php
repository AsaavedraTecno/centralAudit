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
     */
    public function index(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $locations = $this->tenantContext->run($tenant, function () {
            return Location::where('activo', true)
                ->orderBy('nombre')
                ->get([
                    'id', 
                    'nombre', 
                    'direccion', 
                    'comuna', 
                    'region', 
                    'nombre_contacto', 
                    'telefono_contacto',
                    'telefono_alternativo',
                    'comentarios',
                    'activo'
                ]);
        });

        return response()->json([
            'sucursales' => $locations,
        ]);
    }

    /**
     * Detalle de una sucursal
     */
    public function show(Request $request, string $code, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $location = $this->tenantContext->run($tenant, function () use ($id) {
            return Location::with(['printers' => function ($query) {
                $query->select('id', 'location_id', 'model', 'serial_number', 'status');
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
     */
    public function store(Request $request, string $code): JsonResponse
    {
        $user = $request->user();
        $tenant = $this->tenantContext->getTenantWithAccess($code, $user);

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $validated = $request->validate([
            'nombre'               => 'required|string|max:255',
            'direccion'            => 'nullable|string|max:255',
            'comuna'               => 'nullable|string|max:100',
            'region'               => 'nullable|string|max:100',
            'nombre_contacto'      => 'nullable|string|max:255',
            'email_contacto'       => 'nullable|email|max:255',
            'telefono_contacto'    => 'nullable|string|max:20',
            'telefono_alternativo' => 'nullable|string|max:20',
            'comentarios'          => 'nullable|string',
        ]);

        $location = $this->tenantContext->run($tenant, function () use ($validated) {
            return Location::create([
                ...$validated,
                'activo' => true,
            ]);
        });

        return response()->json([
            'message' => 'Sucursal creada exitosamente',
            'sucursal' => $location,
        ], 201);
    }

    /**
     * Actualizar sucursal
     */
    public function update(Request $request, string $code, int $id): JsonResponse
    {
        $user = $request->user();
        $tenant = $this->tenantContext->getTenantWithAccess($code, $user);

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $validated = $request->validate([
            'nombre'               => 'sometimes|string|max:255',
            'direccion'            => 'nullable|string|max:255',
            'comuna'               => 'nullable|string|max:100',
            'region'               => 'nullable|string|max:100',
            'nombre_contacto'      => 'nullable|string|max:255',
            'email_contacto'       => 'nullable|email|max:255',
            'telefono_contacto'    => 'nullable|string|max:20',
            'telefono_alternativo' => 'nullable|string|max:20',
            'comentarios'          => 'nullable|string',
            'activo'               => 'sometimes|boolean',
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
     * Eliminar/desactivar sucursal (Soft Delete manual)
     */
    public function destroy(Request $request, string $code, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $deleted = $this->tenantContext->run($tenant, function () use ($id) {
            $location = Location::find($id);
            if ($location) {
                $location->update(['activo' => false]);
                return true;
            }
            return false;
        });

        if (!$deleted) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json(['message' => 'Sucursal desactivada']);
    }
}