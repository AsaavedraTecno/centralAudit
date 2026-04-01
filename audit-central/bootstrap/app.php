<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )

    ->withSchedule(function (Schedule $schedule) {

        $schedule->call(function () {

            echo "EJECUTANDO SNAPSHOT\n";

            app(\App\Services\Predictions\SnapshotService::class)->generate();

        })->everyMinute();

        $schedule->command('dashboard:update-global-status')
        ->everyMinute()
        ->withoutOverlapping();

    })
    
    ->withMiddleware(function (Middleware $middleware) {
        
       $middleware->validateCsrfTokens(except: [
            'api/*',
            'tenant/*'
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