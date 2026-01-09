<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login y obtener token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        // Validar que el usuario esté activo
        if (!$user->active) {
            throw ValidationException::withMessages([
                'email' => ['Esta cuenta ha sido deshabilitada. Contacta al administrador.'],
            ]);
        }

        // Crear token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleName(),
                'permissions' => $user->getPermissions()->pluck('name'),
                'tenants' => $user->tenantAssignments()->with('tenant')->get()->map(fn($a) => [
                    'id' => $a->tenant_id,
                    'name' => $a->tenant->name,
                    'scope' => $a->scope,
                ]),
            ],
        ]);
    }

    /**
     * Logout - revocar token actual
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada']);
    }

    /**
     * Info del usuario autenticado
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->getRoleName(),
                'permissions' => $user->getPermissions()->pluck('name'),
                'tenants' => $user->tenantAssignments()->with('tenant')->get()->map(fn($a) => [
                    'id' => $a->tenant_id,
                    'name' => $a->tenant->name,
                    'scope' => $a->scope,
                ]),
            ],
        ]);
    }
}
