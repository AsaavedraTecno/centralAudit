<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        using: function () {
            $centralDomains = config('tenancy.central_domains');

            // 1. Configuración de Dominios Centrales (Admin Central)
            foreach ($centralDomains as $domain) {
                Route::middleware('web')
                    ->domain($domain)
                    ->group(base_path('routes/web.php'));
                    
                Route::middleware('api')
                    ->prefix('api')
                    ->domain($domain)
                    ->group(base_path('routes/api.php'));
            }

            // 2. Configuración de Rutas para Tenants (Clientes)
            Route::middleware('web')->group(base_path('routes/tenant.php'));
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        
        // --- CONFIGURACIÓN DE SEGURIDAD Y CORS ---
        
        // Habilitar Sanctum para manejar sesiones y cookies de forma segura
        $middleware->statefulApi();

        // Prepend de HandleCors: Obligatorio para que Laravel acepte 'X-Tenant-Domain' 
        // antes de que el navegador bloquee la petición.
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        // --- MIDDLEWARE POR GRUPOS ---

        $middleware->web(append: [
            \App\Http\Middleware\ResolveTenantFromDomain::class,
        ]);

        $middleware->api(append: [
            // Es crítico que el Tenant se resuelva antes que los permisos o la auditoría
            \App\Http\Middleware\ResolveTenantFromDomain::class,
            \App\Http\Middleware\CheckPermission::class,
            \App\Http\Middleware\AuditLog::class,
        ]);

        // --- ALIAS DE MIDDLEWARE ---

        $middleware->alias([
            'viewer.protect' => \App\Http\Middleware\CheckReadOnly::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();