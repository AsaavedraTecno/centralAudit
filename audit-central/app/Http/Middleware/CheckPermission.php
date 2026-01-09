<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    private array $permissionMap = [
        'GET /api/admin/roles' => 'ver_roles',
        'POST /api/admin/roles' => 'crear_rol',
        'PUT /api/admin/roles/{id}' => 'editar_rol',
        'DELETE /api/admin/roles/{id}' => 'eliminar_rol',
        'POST /api/admin/roles/{id}/permissions' => 'editar_rol',
        'GET /api/admin/users' => 'ver_usuarios',
        'POST /api/admin/users' => 'crear_usuario',
        'PUT /api/admin/users/{id}' => 'editar_usuario',
        'DELETE /api/admin/users/{id}' => 'eliminar_usuario',
        'POST /api/admin/users/{id}/role' => 'editar_usuario',
        'POST /api/admin/users/{id}/reset-password' => 'editar_usuario',
        'GET /api/admin/user-assignments' => 'ver_usuarios',
        'POST /api/admin/user-assignments' => 'editar_usuario',
        'PUT /api/admin/user-assignments/{id}' => 'editar_usuario',
        'DELETE /api/admin/user-assignments/{id}' => 'editar_usuario',
        'GET /api/admin/user-assignments/available/{id}' => 'ver_usuarios',
        'GET /api/admin/permissions' => 'ver_roles',
        'GET /api/admin/permissions/categories' => 'ver_roles',
        'GET /api/admin/audit-logs' => 'ver_audit_logs',
        'GET /api/admin/audit-logs/stats' => 'ver_audit_logs',
        'GET /api/admin/audit-logs/{id}' => 'ver_audit_logs',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->path() === 'api/login') {
            return $next($request);
        }

        if (!str_starts_with($request->path(), 'api/admin/')) {
            return $next($request);
        }

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'No autenticado',
                'errors' => ['auth' => 'Token requerido']
            ], 401);
        }

        $requiredPermission = $this->getRequiredPermission($request);

        if (!$requiredPermission) {
            return $next($request);
        }

        if (!$user->hasPermission($requiredPermission)) {
            return response()->json([
                'message' => 'No autorizado',
                'errors' => ['permission' => "Permiso requerido: $requiredPermission"]
            ], 403);
        }

        return $next($request);
    }

    private function getRequiredPermission(Request $request): ?string
    {
        $method = $request->getMethod();
        $path = $request->path();

        foreach ($this->permissionMap as $pattern => $permission) {
            if ($this->matchPattern($pattern, $method, $path)) {
                return $permission;
            }
        }

        return null;
    }

    private function matchPattern(string $pattern, string $method, string $path): bool
    {
        [$patternMethod, $patternPath] = explode(' ', $pattern, 2);

        if ($patternMethod !== $method) {
            return false;
        }

        $patternPath = trim($patternPath, '/');
        $path = trim($path, '/');

        $regex = preg_quote($patternPath, '#');
        $regex = str_replace('\{id\}', '[^/]+', $regex);
        $regex = "#^$regex$#";

        return preg_match($regex, $path) === 1;
    }
}
