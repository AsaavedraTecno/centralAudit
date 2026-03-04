<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantClientController extends Controller
{
    /**
     * Devuelve la información del propio tenant actual.
     * Esto "engaña" al componente cliente-tree para que crea que hay una lista,
     * pero la lista solo tiene 1 elemento: el propio cliente.
     */
    public function index(Request $request): JsonResponse
    {
        // 'tenant()' es una función global del paquete stancl/tenancy 
        // que contiene los datos del registro actual en la tabla 'tenants' (central)
        $t = tenant();

        // Construimos el objeto cliente siguiendo el formato que espera tu Angular
        $meAsClient = [
            'id'      => $t->id,
            'code'    => $t->id, // O $t->code si usas ese campo
            'nombre'  => $t->nombre ?? $t->id,
            'rut'     => $t->id, // El ID suele ser el slug o RUT en tu sistema
            'status'  => true,
            'region'  => $t->region ?? null,
            'comuna'  => $t->comuna ?? null,
            // Inicializamos sucursales vacío para que el árbol las cargue on-demand
            'sucursales' => [] 
        ];

        return response()->json([
            'success' => true,
            'data'    => [$meAsClient], // <--- IMPORTANTE: Lo enviamos dentro de un Array []
            'pagination' => [
                'total'     => 1,
                'last_page' => 1,
                'current_page' => 1
            ]
        ]);
    }
}