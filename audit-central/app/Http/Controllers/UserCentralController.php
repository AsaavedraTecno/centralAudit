<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserCentralController extends Controller
{
    /**
     * Lista usuarios centrales
     * GET /api/admin/users
     */
    public function index(): JsonResponse
    {
        $users = User::with(['roles', 'tenantAssignments'])->paginate(15);

        // Transformar para incluir el nombre del rol directamente
        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleName(),
                'active' => $user->active,
                'created_at' => $user->created_at,
                'roles' => $user->roles,
                'tenantAssignments' => $user->tenantAssignments,
            ];
        });

        return response()->json([
            'users' => $users,
        ]);
    }

    /**
     * Crear usuario central
     * POST /api/admin/users
     * Body: name, email, role_id, tenants (opcional)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'role_id' => 'required|exists:roles,id',
            'tenants' => 'nullable|array',
            'tenants.*.tenant_id' => 'uuid|exists:tenants,id',
            'tenants.*.scope' => 'in:full,read,support',
        ]);

        // Generar contraseña temporal
        $tempPassword = Str::random(12);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($tempPassword),
            'email_verified_at' => now(),
        ]);

        // Asignar rol
        $user->roles()->attach($validated['role_id']);

        // Asignar tenants si se proporcionan
        if (!empty($validated['tenants'])) {
            foreach ($validated['tenants'] as $tenant) {
                $user->tenantAssignments()->create([
                    'tenant_id' => $tenant['tenant_id'],
                    'scope' => $tenant['scope'] ?? 'read',
                ]);
            }
        }

        return response()->json([
            'message' => 'Usuario creado',
            'user' => $user->load(['roles', 'tenantAssignments']),
            'temp_password' => $tempPassword,
            'note' => 'Compartir esta contraseña temporal con el usuario. Debe cambiarla al primer login.',
        ], 201);
    }

    /**
     * Ver detalles de un usuario
     * GET /api/admin/users/{id}
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'user' => $user->load(['roles', 'tenantAssignments']),
        ]);
    }

    /**
     * Actualizar usuario
     * PUT /api/admin/users/{id}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$user->id}",
            'role_id' => 'required|exists:roles,id',
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        // Actualizar rol (reemplazar si cambia)
        $user->roles()->sync([$validated['role_id']]);

        $tenantsData = [];
        if ($request->has('tenants')) {
            foreach ($request->tenants as $t) {
                $tenantsData[$t['tenant_id']] = [
                    'scope' => $t['scope'] ?? 'view' // Valor por defecto si no viene
                ];
            }
        }
        $user->tenants()->sync($tenantsData);           

        return response()->json([
            'message' => 'Usuario actualizado',
            'user' => $user->load(['roles', 'tenantAssignments']),
        ]);
    }

    /**
     * Eliminar usuario
     * DELETE /api/admin/users/{id}
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado',
        ]);
    }

    /**
     * Asignar rol a usuario
     * POST /api/admin/users/{id}/role
     */
    public function assignRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => 'required|exists:roles,id',
        ]);

        $user->roles()->sync([$validated['role_id']]);

        return response()->json([
            'message' => 'Rol asignado',
            'user' => $user->load('roles'),
        ]);
    }

    /**
     * Toggle estado activo/inactivo de usuario
     * PATCH /api/admin/users/{id}/active
     */
    public function toggleActive(Request $request, User $user): JsonResponse
    {
        $active = $request->input('active');
        // Aceptar booleanos y strings
        if ($active === 'false' || $active === 0 || $active === '0' || $active === false) {
            $user->active = false;
        } else {
            $user->active = true;
        }
        $user->save();
        $user->refresh();
        return response()->json([
            'active' => (bool) $user->active
        ]);
    }

    /**
     * Reset de contraseña (genera nueva temporal)
     * POST /api/admin/users/{id}/reset-password
     */
    public function resetPassword(User $user): JsonResponse
    {
        $tempPassword = Str::random(12);
        $user->update(['password' => Hash::make($tempPassword)]);

        return response()->json([
            'message' => 'Contraseña reseteada',
            'temp_password' => $tempPassword,
            'note' => 'Compartir esta contraseña temporal con el usuario.',
        ]);
    }
}
