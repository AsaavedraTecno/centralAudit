<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Ver logs de auditoría
     * GET /api/admin/audit-logs
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        // Filtro por usuario
        if ($request->has('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        // Filtro por acción
        if ($request->has('action')) {
            $query->where('action', $request->query('action'));
        }

        // Filtro por modelo
        if ($request->has('model')) {
            $query->where('model', $request->query('model'));
        }

        // Filtro por fecha
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->query('from_date'));
        }

        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->query('to_date'));
        }

        $logs = $query->orderByDesc('created_at')->paginate(30);

        return response()->json([
            'logs' => $logs,
        ]);
    }

    /**
     * Ver detalle de un log
     * GET /api/admin/audit-logs/{id}
     */
    public function show(AuditLog $log): JsonResponse
    {
        return response()->json([
            'log' => $log->load('user'),
        ]);
    }

    /**
     * Estadísticas de auditoría
     * GET /api/admin/audit-logs/stats
     */
    public function stats(): JsonResponse
    {
        $totalLogs = AuditLog::count();
        $lastWeek = AuditLog::whereDate('created_at', '>=', now()->subDays(7))->count();
        $lastMonth = AuditLog::whereDate('created_at', '>=', now()->subDays(30))->count();

        $byAction = AuditLog::selectRaw('action, count(*) as total')
            ->groupBy('action')
            ->get();

        $byModel = AuditLog::selectRaw('model, count(*) as total')
            ->groupBy('model')
            ->get();

        return response()->json([
            'total_logs' => $totalLogs,
            'last_week' => $lastWeek,
            'last_month' => $lastMonth,
            'by_action' => $byAction,
            'by_model' => $byModel,
        ]);
    }
}
