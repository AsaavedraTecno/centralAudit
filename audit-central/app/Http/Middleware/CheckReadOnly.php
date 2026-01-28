<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckReadOnly{

    public function handle(Request $request, Closure $next): Response
        {
            $user = $request->user();

            // Si el usuario tiene rol 'viewer' y el método NO es GET (lectura)
            if ($user && $user->role === 'viewer') {
                if (!$request->isMethod('get')) {
                    return response()->json([
                        'error' => 'Acceso Denegado',
                        'message' => 'Tu cuenta es de solo lectura. No tienes permisos para realizar cambios.'
                    ], 403);
                }
            }

            return $next($request);
        }

}

