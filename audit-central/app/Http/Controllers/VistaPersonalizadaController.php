<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVistaPersonalizadaRequest;
use App\Http\Requests\UpdateVistaPersonalizadaRequest;
use App\Models\VistaPersonalizada;
use App\Services\VistaPersonalizadaService;
use Illuminate\Http\JsonResponse;
use App\Models\Tenant;
use Illuminate\Http\Request;


class VistaPersonalizadaController extends Controller
{
    private VistaPersonalizadaService $service;

    public function __construct(VistaPersonalizadaService $service)
    {
        $this->service = $service;
    }

    /**
     * GET /api/vistas-personalizadas
     * Obtener todas las vistas del usuario autenticado
     */
    public function index(): JsonResponse
    {
        $vistas = $this->service->obtenerVistasUsuario(auth()->id());
        return response()->json(['data' => $vistas]);
    }

    /**
     * GET /api/vistas-personalizadas/default
     * Obtener la vista por defecto del usuario
     * Si no existe, la crea automáticamente
     */
    public function default(): JsonResponse
    {
        $vista = $this->service->obtenerVistaPorDefecto(auth()->id());
        return response()->json(['data' => $vista]);
    }

    /**
     * GET /api/vistas-personalizadas/{id}
     * Obtener una vista específica
     */
    public function show(VistaPersonalizada $vistaPersonalizada): JsonResponse
    {
        // Validar que la vista pertenezca al usuario autenticado
        if ($vistaPersonalizada->user_id !== auth()->id()) {
            abort(403, 'No autorizado');
        }

        return response()->json(['data' => $vistaPersonalizada]);
    }

    /**
     * POST /api/vistas-personalizadas
     * Crear una nueva vista personalizada
     */
    public function store(StoreVistaPersonalizadaRequest $request): JsonResponse
    {
        // Validar límite de vistas
        if (!$this->service->validarLimiteSistema(auth()->id())) {
            return response()->json([
                'error' => 'Has alcanzado el límite máximo de vistas personalizadas (10)',
            ], 422);
        }

        // Si es default, quitar esa marca de las otras
        if ($request->boolean('es_default')) {
            VistaPersonalizada::where('user_id', auth()->id())
                ->update(['es_default' => false]);
        }

        $vista = VistaPersonalizada::create([
            ...$request->validated(),
            'user_id' => auth()->id(),
        ]);

        return response()->json(['data' => $vista], 201);
    }

    /**
     * PUT /api/vistas-personalizadas/{id}
     * Actualizar una vista existente
     */
    public function update(
        UpdateVistaPersonalizadaRequest $request,
        VistaPersonalizada $vistaPersonalizada
    ): JsonResponse {
        // Validar que pertenezca al usuario (ya se hace en Request pero lo dejamos claro)
        if ($vistaPersonalizada->user_id !== auth()->id()) {
            abort(403, 'No autorizado');
        }

        // Si es default, quitar esa marca de las otras
        if ($request->boolean('es_default')) {
            VistaPersonalizada::where('user_id', auth()->id())
                ->where('id', '!=', $vistaPersonalizada->id)
                ->update(['es_default' => false]);
        }

        $vistaPersonalizada->update($request->validated());

        return response()->json(['data' => $vistaPersonalizada]);
    }

    /**
     * DELETE /api/vistas-personalizadas/{id}
     * Eliminar una vista
     */
    public function destroy(VistaPersonalizada $vistaPersonalizada): JsonResponse
    {
        // Validar que pertenezca al usuario
        if ($vistaPersonalizada->user_id !== auth()->id()) {
            abort(403, 'No autorizado');
        }

        // Evitar eliminar la vista por defecto
        if ($vistaPersonalizada->es_default) {
            return response()->json([
                'error' => 'No puedes eliminar la vista por defecto',
            ], 422);
        }

        $vistaPersonalizada->delete();

        return response()->json(['mensaje' => 'Vista eliminada correctamente']);
    }

    /**
     * POST /api/vistas-personalizadas/{id}/duplicar
     * Duplicar una vista existente
     */
    public function duplicar(VistaPersonalizada $vistaPersonalizada): JsonResponse
    {
        // Validar que pertenezca al usuario
        logger([
            'auth_id' => auth()->id(),
            'vista_user_id' => $vistaPersonalizada->user_id,
        ]);
        if ($vistaPersonalizada->user_id !== auth()->id()) {
            abort(403, 'No autorizado');
        }

        // Validar límite de vistas
        if (!$this->service->validarLimiteSistema(auth()->id())) {
            return response()->json([
                'error' => 'Has alcanzado el límite máximo de vistas personalizadas (10)',
            ], 422);
        }

        $nuevaVista = $this->service->duplicarVista($vistaPersonalizada, auth()->id());

        return response()->json(['data' => $nuevaVista], 201);
    }

    /**
     * GET /api/vistas-personalizadas/columnas/disponibles
     * Obtener todas las columnas disponibles del sistema
     */
    public function columnasDisponibles(): JsonResponse
    {
        $columnas = $this->service->obtenerColumnasDefault();
        return response()->json(['columnas' => $columnas]);
    }


    public function tenants(VistaPersonalizada $vistaPersonalizada): JsonResponse
    {
        $asignadosIds = $vistaPersonalizada->tenants()->pluck('tenants.id');

        $asignados = Tenant::whereIn('id', $asignadosIds)
            ->select('id', 'nombre')
            ->get();

        $disponibles = Tenant::whereNotIn('id', $asignadosIds)
            ->select('id', 'nombre')
            ->get();

        return response()->json([
            'asignados' => $asignados,
            'disponibles' => $disponibles
        ]);
    }

    public function guardarTenants( VistaPersonalizada $vistaPersonalizada, Request $request ): JsonResponse 
    {

        $request->validate([
            'tenants' => 'array',
            'tenants.*' => 'exists:tenants,id'
        ]);

        $vistaPersonalizada->tenants()->sync($request->tenants);

        return response()->json([
            'mensaje' => 'Asignación actualizada'
        ]);
    }
    
}