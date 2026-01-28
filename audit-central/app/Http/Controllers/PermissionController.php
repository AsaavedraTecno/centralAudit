<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Lista todos los permisos (agrupados por categoría)
     * GET /api/admin/permissions
     */
    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');

        $query = Permission::query();

        if ($category) {
            $query->where('category', $category);
        }

        $permissions = $query->orderBy('category')->orderBy('name')->get();

        // Agrupar por categoría
        $grouped = $permissions->groupBy('category');

        return response()->json([
            'permissions' => $grouped,
            'total' => $permissions->count(),
        ]);
    }

    /**
     * Ver categorías disponibles
     * GET /api/admin/permissions/categories
     */
    public function categories(): JsonResponse
    {
        $categories = Permission::distinct()
            ->pluck('category')
            ->sort()
            ->values();

        return response()->json([
            'categories' => $categories,
        ]);
    }

        /**
     * Lista TODOS los permisos sin paginación (Para selectores/checkboxes)
     * GET /api/admin/permissions-list
     */
    public function list(): JsonResponse
    {
        // Agrupar por categoría para una mejor UI. Asumimos que el modelo Permission tiene un campo 'category'.
        // Si no lo tiene, puedes usar ->get() directamente.
        $permissions = Permission::orderBy('category')->orderBy('name')->get()
            ->groupBy('category');

        return response()->json($permissions);
    }

}
