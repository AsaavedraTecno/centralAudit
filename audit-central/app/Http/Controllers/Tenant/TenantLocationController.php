<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantLocationController extends Controller
{
    /**
     * Lista las sucursales del tenant actual.
     * El parámetro $code llega desde Angular, pero lo ignoramos porque
     * la base de datos ya está filtrada por el dominio.
     */
    public function index(Request $request, string $code): JsonResponse
    {
        $locations = Location::where('activo', true)
            ->orderBy('nombre')
            ->get();

        // ENVOLVEMOS EN 'data' para que el Service de Angular lo encuentre
        return response()->json([
            'success' => true,
            'data' => $locations 
        ]);
    }
}