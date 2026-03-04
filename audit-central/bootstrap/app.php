<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        
        // Habilitar CORS para que Angular (dominio distinto) pueda conectar
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(append: [
            // Por ahora lo dejamos limpio ya que usas Passport Stateless.
        ]);

        $middleware->alias([
            'viewer.protect' => \App\Http\Middleware\CheckReadOnly::class,
            'tenancy' => \App\Http\Middleware\ResolveTenantFromDomain::class,
            'permissions' => \App\Http\Middleware\CheckPermission::class,
            'audit' => \App\Http\Middleware\AuditLog::class,
        ]);

        // Prioridad: Aseguramos que Tenancy se resuelva antes que cualquier otra cosa
        $middleware->priority([
            \Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains::class,
            \Stancl\Tenancy\Middleware\InitializeTenancyByDomain::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Illuminate\Auth\Middleware\Authenticate::class,
            \Illuminate\Auth\Middleware\Authorize::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();