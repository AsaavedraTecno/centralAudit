<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Lista todos los roles
     * GET /api/admin/roles
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->paginate(15);

        return response()->json([
            'roles' => $roles,
        ]);
    }

    /**
     * Crear nuevo rol
     * POST /api/admin/roles
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:roles|max:50',
            'description' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:7',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? '#cccccc',
        ]);

        if (!empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json([
            'message' => 'Rol creado exitosamente',
            'role' => $role->load('permissions'),
        ], 201);
    }

    /**
     * Ver detalle de un rol
     * GET /api/admin/roles/{id}
     */
    public function show(Role $role): JsonResponse
    {
        return response()->json([
            'role' => $role->load('permissions'),
        ]);
    }

    /**
     * Actualizar rol
     * PUT /api/admin/roles/{id}
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => "required|string|unique:roles,name,{$role->id}|max:50",
            'description' => 'nullable|string|max:255',
            'color' => 'nullable|string|max:7',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? $role->color,
        ]);

        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json([
            'message' => 'Rol actualizado',
            'role' => $role->load('permissions'),
        ]);
    }

    /**
     * Eliminar rol
     * DELETE /api/admin/roles/{id}
     */
    public function destroy(Role $role): JsonResponse
    {
        $role->delete();

        return response()->json([
            'message' => 'Rol eliminado',
        ]);
    }

    /**
     * Asignar permisos a un rol
     * POST /api/admin/roles/{id}/permissions
     */
    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($validated['permissions']);

        return response()->json([
            'message' => 'Permisos asignados',
            'role' => $role->load('permissions'),
        ]);
    }

    /**
     * Lista TODOS los roles sin paginación (Para selectores/dropdowns)
     * GET /api/admin/roles-list
     */
    public function list(): JsonResponse
    {
        // Ahora también traemos el color para usarlo en los badges
        $roles = Role::select('id', 'name', 'description', 'color')->get();

        return response()->json($roles);
    }

}
