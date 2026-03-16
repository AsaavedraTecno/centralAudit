<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{
    AgentController,
    AgentKeyController,
    AgentConfigurationController, 
    AuthController,
    ClientController,
    LocationController,
    PrinterController,
    RoleController,
    PermissionController,
    UserCentralController,
    UserTenantAssignmentController,
    AuditLogController,
    VistaPersonalizadaController,
    PredictionController,
};

/*
| API Routes - Sistema Multi-Tenant Monitoreo
*/

$centralDomain = config('tenancy.central_domains')[0] ?? 'centralaudit.tecnodatasa.cl';

    // 2. AGENT ENDPOINTS (Auth por Header X-Agent-Key)

    Route::prefix('agent')->group(function () {
        Route::post('/activate', [AgentController::class, 'activate']);
        Route::post('/checkin', [AgentController::class, 'checkin']);

        Route::get('/config', [AgentController::class, 'config']);
        
        Route::post('/sync', [AgentController::class, 'sync']);
        Route::post('/telemetry', [AgentController::class, 'telemetry']);
    });

// =============================================
// 1. RUTAS PÚBLICAS (Abiertas)
// =============================================
Route::domain($centralDomain)->group(function () {

    Route::post('/login', [AuthController::class, 'login']);

    Route::get(
        'vistas-personalizadas/columnas/disponibles',
        [VistaPersonalizadaController::class, 'columnasDisponibles']
    );


    // =============================================
    // 3. RUTAS PROTEGIDAS (Token passport)
    // =============================================
    Route::middleware('auth:api')->group(function () {

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
        // =============================================
        Route::prefix('clients')->group(function () {
            Route::get('/', [ClientController::class, 'index']);
            Route::post('/', [ClientController::class, 'store']);
            Route::get('/{code}', [ClientController::class, 'show']);
            Route::put('/{code}', [ClientController::class, 'update']);
            Route::delete('/{code}', [ClientController::class, 'destroy']);
            Route::get('/{code}/tree', [ClientController::class, 'tree']);

            Route::get('/{code}/locations', [LocationController::class, 'index']);

            // Agent Keys (Generación de Llaves)
            Route::prefix('{code}/agent-keys')->group(function () {
                Route::get('/', [AgentKeyController::class, 'index']);
                Route::post('/', [AgentKeyController::class, 'store']);
                Route::delete('/{id}', [AgentKeyController::class, 'destroy']);
                Route::patch('/{id}/activate', [AgentKeyController::class, 'activate']);
            });
        });

        // =============================================
        // C. RUTAS DE CONFIGURACIÓN DE AGENTES (TENANTS)
        // =============================================
        // Esta es la sección que faltaba para solucionar tu error 404
        Route::prefix('tenants/{code}')->group(function () {

            Route::patch('impresoras/{serie}/status', [PrinterController::class, 'updateStatus']);
            Route::patch('impresoras/{id}/admin-fields', [PrinterController::class, 'updateAdminFields']);

            
            // Configuración Técnica del Agente (Wizard y Mantenedor)
            Route::get('/agent-config/{agentKeyId}', [AgentConfigurationController::class, 'show']);
            Route::post('/agent-config', [AgentConfigurationController::class, 'store']); // <--- ESTA ES LA CRÍTICA PARA EL WIZARD

            // Sucursales (Locations)
            Route::prefix('sucursales')->group(function () {
                Route::get('/', [LocationController::class, 'index']);
                Route::post('/', [LocationController::class, 'store']);
                Route::get('/{id}', [LocationController::class, 'show']);
                Route::put('/{id}', [LocationController::class, 'update']);
                Route::delete('/{id}', [LocationController::class, 'destroy']);
            });

            // Impresoras vinculadas a la sucursal
            Route::prefix('sucursales/{id}/impresoras')->group(function () {
                Route::get('/', [PrinterController::class, 'index']);
                Route::get('/{printerId}', [PrinterController::class, 'show']);
                Route::get('/{printerId}/counters', [PrinterController::class, 'counters']);
                Route::get('/{printerId}/supplies', [PrinterController::class, 'supplies']);
            });




        });

            //  PREDICCIONES
            Route::prefix('predictions')->group(function () {
                // Resumen global
                Route::get('/summary', [PredictionController::class, 'globalSummary']);
                Route::get('/summary/detailed', [PredictionController::class, 'globalSummaryDetailed']);
                
                // Resúmenes agrupados
                Route::get('/summary/by-tenant', [PredictionController::class, 'byTenant']);
                Route::get('/summary/by-location', [PredictionController::class, 'byLocation']);
                
                // Listas críticas
                Route::get('/critical-top', [PredictionController::class, 'topCritical']);
                Route::get('/urgent', [PredictionController::class, 'urgent']);
                
                // Datos para gráficos
                Route::get('/trend', [PredictionController::class, 'trend']);
                Route::get('/last-update', [PredictionController::class, 'lastUpdate']);
            });

            /*
            |--------------------------------------------------------------------------
            | D. VISTAS PERSONALIZADAS
            |--------------------------------------------------------------------------
            | Rutas para gestionar vistas personalizadas por usuario
            | URL base: /api/vistas-personalizadas
            */

        // RUTAS PROTEGIDAS - Con autenticación
        Route::prefix('vistas-personalizadas')->group(function () {

            Route::get('default', [VistaPersonalizadaController::class, 'default']);

            Route::get('/', [VistaPersonalizadaController::class, 'index']);
            Route::post('/', [VistaPersonalizadaController::class, 'store']);
            Route::get('/{vistaPersonalizada}', [VistaPersonalizadaController::class, 'show']);
            Route::put('/{vistaPersonalizada}', [VistaPersonalizadaController::class, 'update']);
            Route::delete('/{vistaPersonalizada}', [VistaPersonalizadaController::class, 'destroy']);
            Route::post('/{vistaPersonalizada}/duplicar', [VistaPersonalizadaController::class, 'duplicar']);

            Route::get('/{vistaPersonalizada}/tenants', [VistaPersonalizadaController::class, 'tenants']);
            Route::post('/{vistaPersonalizada}/tenants', [VistaPersonalizadaController::class, 'guardarTenants']);

        });
    });

    

});
