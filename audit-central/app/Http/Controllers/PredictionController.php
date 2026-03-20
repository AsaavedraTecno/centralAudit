<?php

namespace App\Http\Controllers;

use App\Services\Predictions\PredictionSummaryService;
use Illuminate\Http\JsonResponse;

class PredictionController extends Controller
{
    public function __construct(protected PredictionSummaryService $summaryService) {}

    /**
     * Resumen global simple
     * GET /api/predictions/summary
     */
    public function globalSummary(): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getGlobalSummary(),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Resumen global detallado
     * GET /api/predictions/summary/detailed
     */
    public function globalSummaryDetailed(): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getGlobalSummaryDetailed(),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Resumen por tenant
     * GET /api/predictions/summary/by-tenant
     */
    public function byTenant(): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getSummaryByTenant(),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Resumen por ubicación
     * GET /api/predictions/summary/by-location
     */
    public function byLocation(): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getSummaryByLocation(),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Top impresoras críticas
     * GET /api/predictions/critical-top
     */
    public function topCritical(): JsonResponse
    {
        try {
            $limit = request('limit', 20);
            return response()->json(
                $this->summaryService->getTopCritical($limit),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Impresoras que necesitan atención inmediata
     * GET /api/predictions/urgent
     */
    public function urgent(): JsonResponse
    {
        try {
            $limit = request('limit', 10);
            return response()->json(
                $this->summaryService->getUrgent($limit),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Tendencia de últimos 30 días
     * GET /api/predictions/trend
     */
    public function trend(): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getTrendData(),
                200
            );
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    /**
     * Última actualización
     * GET /api/predictions/last-update
     */
    public function lastUpdate(): JsonResponse
    {
        try {
            return response()->json([
                'last_update' => $this->summaryService->getLastUpdate()
            ], 200);
        } catch (\Exception $e) {
            return response()->json(
                ['error' => $e->getMessage()],
                500
            );
        }
    }

    public function byLocationTenant(string $code, int $locationId): JsonResponse
    {
        try {
            return response()->json(
                $this->summaryService->getLocationDashboard($code, $locationId),
                200
            );
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }
}