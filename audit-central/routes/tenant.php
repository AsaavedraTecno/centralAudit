<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Tenant\TenantAuthController; 
use App\Http\Controllers\Tenant\TenantClientController; 
use App\Http\Controllers\Tenant\TenantLocationController; 
use App\Http\Controllers\Tenant\TenantPrinterController; 




/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
| Estas rutas se cargan automáticamente con el prefijo /api y los 
| middlewares de Tenancy gracias al TenancyServiceProvider.
*/


Route::post('/login', [TenantAuthController::class, 'login']);
Route::post('/register', [TenantAuthController::class, 'register']);
    Route::get('/panel/vista', [TenantPrinterController::class, 'vistaPanel']);

// Rutas que requieren que el usuario esté logueado dentro del tenant
Route::middleware('auth:tenant-api')->group(function () {
    
    Route::get('/me', [TenantAuthController::class, 'me']);
    Route::post('/logout', [TenantAuthController::class, 'logout']);

    Route::get('/clients', [TenantClientController::class, 'index']);

    Route::get('tenants/{code}/sucursales', [TenantLocationController::class, 'index']);

    Route::get('tenants/{code}/sucursales/{id}/impresoras', [TenantPrinterController::class, 'index']);
    

    
});