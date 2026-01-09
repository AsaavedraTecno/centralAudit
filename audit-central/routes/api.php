<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AgentKeyController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PrinterController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\UserCentralController;
use App\Http\Controllers\UserTenantAssignmentController;
use App\Http\Controllers\AuditLogController;
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
    // RBAC CENTRAL - Gestión de Roles, Permisos, Usuarios
    // =============================================
    Route::prefix('admin')->group(function () {
        
        // Roles
        Route::get('roles-list', [RoleController::class, 'list']);
        Route::post('roles/{role}/permissions', [RoleController::class, 'assignPermissions']);
        Route::apiResource('roles', RoleController::class);

        // Permisos
        Route::get('permissions', [PermissionController::class, 'index']);
        Route::get('permissions/categories', [PermissionController::class, 'categories']);

        // Usuarios centrales
        Route::apiResource('users', UserCentralController::class);
        Route::post('users/{user}/role', [UserCentralController::class, 'assignRole']);
        Route::patch('users/{user}/active', [UserCentralController::class, 'toggleActive']);
        Route::post('users/{user}/reset-password', [UserCentralController::class, 'resetPassword']);

        // Asignación de clientes a usuarios
        Route::apiResource('user-assignments', UserTenantAssignmentController::class);
        Route::get('user-assignments/available/{userId}', [UserTenantAssignmentController::class, 'availableTenants']);

        // Auditoría
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/stats', [AuditLogController::class, 'stats']);
        Route::get('audit-logs/{log}', [AuditLogController::class, 'show']);
    });

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
