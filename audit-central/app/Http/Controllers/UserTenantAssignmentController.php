<?php

namespace App\Http\Controllers;

use App\Models\UserTenantAssignment;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserTenantAssignmentController extends Controller
{
    /**
     * Ver asignaciones de un usuario
     * GET /api/admin/user-assignments?user_id=1
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->query('user_id');

        $query = UserTenantAssignment::with(['user', 'tenant']);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $assignments = $query->paginate(15);

        return response()->json([
            'assignments' => $assignments,
        ]);
    }

    /**
     * Asignar cliente a usuario
     * POST /api/admin/user-assignments
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'scope' => 'required|in:full,read,support',
        ]);

        // Verificar que no exista asignación duplicada
        $existing = UserTenantAssignment::where('user_id', $validated['user_id'])
            ->where('tenant_id', $validated['tenant_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Este usuario ya tiene acceso a este cliente',
            ], 409);
        }

        $assignment = UserTenantAssignment::create($validated);

        return response()->json([
            'message' => 'Asignación creada',
            'assignment' => $assignment->load(['user', 'tenant']),
        ], 201);
    }

    /**
     * Actualizar scope de acceso
     * PUT /api/admin/user-assignments/{id}
     */
    public function update(Request $request, UserTenantAssignment $assignment): JsonResponse
    {
        $validated = $request->validate([
            'scope' => 'required|in:full,read,support',
        ]);

        $assignment->update($validated);

        return response()->json([
            'message' => 'Scope actualizado',
            'assignment' => $assignment->load(['user', 'tenant']),
        ]);
    }

    /**
     * Remover acceso a cliente
     * DELETE /api/admin/user-assignments/{id}
     */
    public function destroy(UserTenantAssignment $assignment): JsonResponse
    {
        $assignment->delete();

        return response()->json([
            'message' => 'Acceso removido',
        ]);
    }

    /**
     * Ver clientes disponibles para asignar a un usuario
     * GET /api/admin/user-assignments/available/{userId}
     */
    public function availableTenants($userId): JsonResponse
    {
        $user = User::findOrFail($userId);

        // Tenants ya asignados
        $assignedIds = $user->tenantAssignments()
            ->pluck('tenant_id')
            ->toArray();

        // Tenants disponibles (no asignados)
        $available = Tenant::whereNotIn('id', $assignedIds)
            ->select('id', 'name', 'code')
            ->get();

        return response()->json([
            'available_tenants' => $available,
        ]);
    }
}
