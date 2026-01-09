<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\AuditLog as AuditLogModel;

class AuditLog
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user || !str_starts_with($request->path(), 'api/admin/')) {
            return $next($request);
        }

        $requestData = $request->all();
        $response = $next($request);

        if (in_array($request->getMethod(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            \Log::debug('AuditLog middleware triggered', [
                'method' => $request->getMethod(),
                'path' => $request->path(),
                'user_id' => $user->id,
            ]);
            $this->logAction($request, $user, $response, $requestData);
        }

        return $response;
    }

    private function logAction(Request $request, $user, Response $response, $requestData)
    {
        try {
            $method = $request->getMethod();
            $path = $request->path();
            
            $action = match($method) {
                'POST' => 'create',
                'PUT', 'PATCH' => 'update',
                'DELETE' => 'delete',
                default => 'unknown'
            };

            $targetType = $this->extractModel($path);
            $targetId = $this->extractModelId($path);

            \Log::debug('AuditLog extracted data', [
                'path' => $path,
                'targetType' => $targetType,
                'targetId' => $targetId,
                'action' => $action,
                'isEmpty' => empty($targetType),
                'isUnknown' => $targetType === 'unknown',
            ]);

            // Solo loguear si tenemos un target_type válido
            if (!empty($targetType) && $targetType !== 'unknown') {
                \Log::debug('Creating audit log entry with data', [
                    'user_id' => $user->id,
                    'action' => $action,
                    'target_type' => $targetType,
                    'target_id' => $targetId,
                ]);
                AuditLogModel::create([
                    'user_id' => $user->id,
                    'action' => $action,
                    'target_type' => $targetType,
                    'target_id' => $targetId,
                    'changes' => json_encode($requestData),
                    'ip' => $request->ip(),
                ]);
                \Log::info('Audit log entry created successfully');
            } else {
                \Log::warning('Skipping audit log - invalid targetType', [
                    'targetType' => $targetType,
                    'isEmpty' => empty($targetType),
                    'isUnknown' => $targetType === 'unknown',
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Audit log error: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'path' => $request->path(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    private function extractModel(string $path): string
    {
        // api/admin/users → users
        // api/admin/users/1 → users
        $parts = explode('/', trim($path, '/'));
        
        // Buscar después de "admin"
        $adminIndex = array_search('admin', $parts);
        if ($adminIndex !== false && isset($parts[$adminIndex + 1])) {
            $model = $parts[$adminIndex + 1];
            // Si el modelo es un número, volver a intentar con el siguiente elemento
            if (is_numeric($model) && isset($parts[$adminIndex + 2])) {
                return $parts[$adminIndex + 2];
            }
            return $model ?: 'unknown';
        }
        
        return 'unknown';
    }

    private function extractModelId(string $path): ?string
    {
        $parts = explode('/', trim($path, '/'));
        
        // Buscar después de "admin" + "modelo"
        $adminIndex = array_search('admin', $parts);
        if ($adminIndex !== false && isset($parts[$adminIndex + 2])) {
            $id = $parts[$adminIndex + 2];
            if (is_numeric($id) || preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
                return $id;
            }
        }
        
        return null;
    }
}

