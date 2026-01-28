<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AgentController,
    AgentKeyController,
    AuthController,
    ClientController,
    LocationController,
    PrinterController,
    RoleController,
    PermissionController,
    UserCentralController,
    UserTenantAssignmentController,
    AuditLogController,
    AgentProtocolController
};

/*
|--------------------------------------------------------------------------
| API Routes - Sistema Multi-Tenant Monitoreo
|--------------------------------------------------------------------------
*/

// =============================================
// 1. RUTAS PÚBLICAS (Abiertas)
// =============================================
Route::post('/login', [AuthController::class, 'login']);

Route::middleware([
    \App\Http\Middleware\ResolveTenantFromDomain::class, 
])->post('/register', [AuthController::class, 'register']);

// =============================================
// 2. AGENT ENDPOINTS (Auth por Header X-Agent-Key)
// =============================================
Route::prefix('agent')->group(function () {
    Route::post('/activate', [AgentController::class, 'activate']);
    Route::post('/checkin', [AgentController::class, 'checkin']);
    Route::post('/sync', [AgentController::class, 'sync']);
    Route::post('/telemetry', [AgentController::class, 'telemetry']);
    Route::post('/handshake', [AgentProtocolController::class, 'handshake']);
});

// =============================================
// 3. RUTAS PROTEGIDAS (Token Sanctum)
// =============================================
Route::middleware('auth:sanctum')->group(function () {

    // --- Auth General ---
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // =============================================
    // A. PANEL ADMINISTRATIVO (CENTRAL)
    // =============================================
    Route::prefix('admin')->group(function () {
        // Roles y Permisos
        Route::get('roles-list', [RoleController::class, 'list']);
        Route::get('permissions-list', [PermissionController::class, 'list']);
        Route::get('permissions/categories', [PermissionController::class, 'categories']);
        Route::post('roles/{role}/permissions', [RoleController::class, 'assignPermissions']);
        Route::apiResource('roles', RoleController::class);
        Route::apiResource('permissions', PermissionController::class);

        // Gestión de Usuarios Globales
        Route::apiResource('users', UserCentralController::class);
        Route::post('users/{user}/role', [UserCentralController::class, 'assignRole']);
        Route::patch('users/{user}/active', [UserCentralController::class, 'toggleActive']);
        Route::post('users/{user}/reset-password', [UserCentralController::class, 'resetPassword']);

        // Asignación de Clientes a Usuarios Centrales
        Route::apiResource('user-assignments', UserTenantAssignmentController::class);
        Route::get('user-assignments/available/{userId}', [UserTenantAssignmentController::class, 'availableTenants']);

        // Auditoría Global
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/stats', [AuditLogController::class, 'stats']);
        Route::get('audit-logs/{log}', [AuditLogController::class, 'show']);
    });

    // =============================================
    // B. GESTIÓN DE CLIENTES (TENANTS) - BD CENTRAL
    // Operaciones CRUD sobre la tabla 'tenants' (clients)
    // =============================================
    Route::prefix('clients')->group(function () {
        Route::get('/', [ClientController::class, 'index']);
        Route::post('/', [ClientController::class, 'store']);
        Route::get('/{code}', [ClientController::class, 'show']);
        Route::put('/{code}', [ClientController::class, 'update']);
        Route::delete('/{code}', [ClientController::class, 'destroy']);
        Route::get('/{code}/tree', [ClientController::class, 'tree']);

        // Configuración Agente
        Route::patch('/{code}/agents/{id}/setup', [ClientController::class, 'setupAgent']);

        // Agent Keys
        Route::prefix('{code}/agent-keys')->group(function () {
            Route::get('/', [AgentKeyController::class, 'index']);
            Route::post('/', [AgentKeyController::class, 'store']);
            Route::delete('/{id}', [AgentKeyController::class, 'destroy']);
            Route::patch('/{id}/activate', [AgentKeyController::class, 'activate']);
        });
    }); 
    // <--- IMPORTANTE: Aquí cerramos el grupo 'clients'.
    // El bloque siguiente (C) queda AFUERA, al nivel raíz.


    // =============================================
    // C. DATOS ESPECÍFICOS DEL TENANT (Sucursales, Impresoras)
    // URL resultante: /api/{code}/sucursales
    // =============================================
    
    // Quitamos el middleware ResolveTenantFromDomain porque el controlador
    // hace el cambio de contexto manualmente usando el {code}.
    
    Route::prefix('{code}')->group(function () {
        
        // Sucursales (Locations)
        Route::prefix('sucursales')->group(function () {
            Route::get('/', [LocationController::class, 'index']);
            Route::post('/', [LocationController::class, 'store']);
            Route::get('/{id}', [LocationController::class, 'show']);
            Route::put('/{id}', [LocationController::class, 'update']);
            Route::delete('/{id}', [LocationController::class, 'destroy']);
        });

        // Impresoras vinculadas a la sucursal: api/{code}/sucursales/{id}/impresoras
        Route::prefix('sucursales/{id}/impresoras')->group(function () {
            Route::get('/', [PrinterController::class, 'index']);
            Route::get('/{printerId}', [PrinterController::class, 'show']);
            Route::get('/{printerId}/counters', [PrinterController::class, 'counters']);
            Route::get('/{printerId}/supplies', [PrinterController::class, 'supplies']);
        });
    });

});