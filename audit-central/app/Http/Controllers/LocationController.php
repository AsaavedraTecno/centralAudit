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

    public function index(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        // SOLUCIÓN: Convertimos a array DENTRO del contexto
        $locations = $this->tenantContext->run($tenant, function () {
            return Location::where('activo', true)
                ->orderBy('nombre')
                ->get()
                ->toArray(); // <--- AQUÍ ESTÁ LA MAGIA
        });

        return response()->json([
            'sucursales' => $locations,
        ]);
    }

    public function show(Request $request, string $code, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $locationData = $this->tenantContext->run($tenant, function () use ($id) {
            $location = Location::with(['printers'])->find($id);
            return $location ? $location->toArray() : null; // Convertir a array si existe
        });

        if (!$locationData) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'sucursal' => $locationData,
        ]);
    }

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

        // SOLUCIÓN: Guardamos y convertimos a array antes de salir
        $locationData = $this->tenantContext->run($tenant, function () use ($validated) {
            $location = Location::create([
                ...$validated,
                'activo' => true,
            ]);
            return $location->toArray(); // <--- IMPORTANTE
        });

        return response()->json([
            'message' => 'Sucursal creada exitosamente',
            'sucursal' => $locationData, // Devolvemos el array puro
        ], 201);
    }

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

        $locationData = $this->tenantContext->run($tenant, function () use ($id, $validated) {
            $location = Location::find($id);
            if ($location) {
                $location->update($validated);
                return $location->fresh()->toArray(); // <--- Convertir a array actualizado
            }
            return null;
        });

        if (!$locationData) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'message' => 'Sucursal actualizada',
            'sucursal' => $locationData,
        ]);
    }

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