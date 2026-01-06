<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AgentKeyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PrinterController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rutas públicas
Route::post('/login', [AuthController::class, 'login']);

// =============================================
// Agent Endpoints (autenticación por X-Agent-Key header)
// =============================================
Route::prefix('agent')->group(function () {
    Route::post('/activate', [AgentController::class, 'activate']);
    Route::post('/checkin', [AgentController::class, 'checkin']);
    Route::post('/sync', [AgentController::class, 'sync']);           // Formato simple
    Route::post('/telemetry', [AgentController::class, 'telemetry']); // Formato Go agent
});

// Rutas protegidas (requieren token Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    
    // =============================================
    // Auth
    // =============================================
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // =============================================
    // Clientes (tenants) - BD Central
    // =============================================
    Route::prefix('clients')->group(function () {
        Route::get('/', [ClientController::class, 'index']);
        Route::post('/', [ClientController::class, 'store']);              // Solo superadmin
        Route::get('/{code}', [ClientController::class, 'show']);
        Route::put('/{code}', [ClientController::class, 'update']);        // Solo superadmin
        Route::delete('/{code}', [ClientController::class, 'destroy']);    // Solo superadmin
        Route::get('/{code}/tree', [ClientController::class, 'tree']);

        // =============================================
        // Agent Keys - BD Central
        // =============================================
        Route::prefix('{code}/agent-keys')->group(function () {
            Route::get('/', [AgentKeyController::class, 'index']);
            Route::post('/', [AgentKeyController::class, 'store']);
            Route::delete('/{id}', [AgentKeyController::class, 'destroy']);
            Route::patch('/{id}/activate', [AgentKeyController::class, 'activate']);
        });

        // =============================================
        // Sucursales (locations) - BD Tenant
        // =============================================
        Route::prefix('{code}/sucursales')->group(function () {
            Route::get('/', [LocationController::class, 'index']);
            Route::post('/', [LocationController::class, 'store']);
            Route::get('/{id}', [LocationController::class, 'show']);
            Route::put('/{id}', [LocationController::class, 'update']);
            Route::delete('/{id}', [LocationController::class, 'destroy']);

            // =============================================
            // Impresoras (printers) - BD Tenant
            // =============================================
            Route::prefix('{id}/impresoras')->group(function () {
                Route::get('/', [PrinterController::class, 'index']);
                Route::get('/{printerId}', [PrinterController::class, 'show']);
                Route::get('/{printerId}/counters', [PrinterController::class, 'counters']);
                Route::get('/{printerId}/supplies', [PrinterController::class, 'supplies']);
            });
        });
    });
});
