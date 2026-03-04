<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\User; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules; 

class TenantAuthController extends Controller
{
    /**
     * LOGIN DEL INQUILINO (CLIENTE)
     * Ruta: POST http://cliente1.dominio.com/api/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Como estamos en una ruta protegida por el middleware de Tenancy,
        // User::where busca AUTOMÁTICAMENTE en la base de datos del cliente.
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas en este entorno.'],
            ]);
        }

        // Validación de activo (asumiendo que tienes esta columna en la tabla users del tenant)
        if (isset($user->active) && !$user->active) {
            throw ValidationException::withMessages([
                'email' => ['Cuenta deshabilitada.'],
            ]);
        }

        // Crear token (Passport guardará esto en la tabla oauth_access_tokens DEL TENANT)
        $token = $user->createToken('TenantToken')->accessToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'permissions' => $this->getSimulatedPermissions($user->role),
                'tenant_id' => tenant('id'), // Útil para el frontend
                'tenant_name' => tenant('name'),
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $userData = $user->toArray();
        $userData['role'] = $user->role;
        $userData['permissions'] = $this->getSimulatedPermissions($user->role);

        return response()->json(['user' => $userData]);
    }

    public function logout(Request $request)
    {
        $request->user()->token()->revoke();
        return response()->json(['message' => 'Sesión cerrada en el tenant']);
    }


    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // 1. Crear el usuario
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'admin',
            'active' => true,
        ]);

        $token = $user->createToken('Token Acceso Inicial')->accessToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => '¡Registro exitoso en el subdominio!'
        ], 201);
    }

    private function getSimulatedPermissions($role)
    {
        // Define aquí qué puede hacer cada rol básico
        return match ($role) {
            'admin' => ['all', 'view_dashboard', 'manage_printers', 'manage_users'],
            'viewer' => ['view_dashboard', 'view_printers'],
            default => [],
        };
    }
    
}