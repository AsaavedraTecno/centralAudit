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

    public function register(Request $request)
    {
        // 1. Validar datos de entrada
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Obtener el tenant actual inicializado por el middleware
        $tenant = tenancy()->tenant ?? null;

        if (! $tenant) {
            return response()->json(['error' => 'No se pudo identificar el tenant.'], 400);
        }

        // 2-5. Ejecutar la comprobación de cupo y la creación dentro del contexto del tenant
        $createdUser = null;

        $tenant->run(function () use ($request, &$createdUser) {
            // Límite de usuarios configurado en el tenant (fallback 5)
            $limitePermitido = tenant('max_viewers') ?? 5;

            // Contar usuarios actuales en la base de datos del cliente
            $usuariosActuales = \App\Models\Tenant\User::count();

            if ($usuariosActuales > 0 && $usuariosActuales >= $limitePermitido) {
                abort(response()->json([
                    'error' => 'Cupo de usuarios completo.',
                    'message' => "Esta suscripción solo permite {$limitePermitido} usuarios."
                ], 403));
            }

            // Crear el usuario en la BD del tenant
            $createdUser = \App\Models\Tenant\User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => Hash::make($request->password),
                'role'     => 'viewer',
                'active'   => true,
            ]);
        });

        // Si abort fue llamado dentro del run, la respuesta ya fue enviada. Si no, seguimos.
        $user = $createdUser;

        return response()->json([
            'success' => true,
            'message' => 'Cuenta creada exitosamente en ' . tenant('nombre'),
            'user'    => $user
        ], 201);
    }
}
