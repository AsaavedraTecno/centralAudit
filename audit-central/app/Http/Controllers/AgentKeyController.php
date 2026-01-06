<?php

namespace App\Http\Controllers;

use App\Models\AgentKey;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentKeyController extends Controller
{
    /**
     * Listar keys de un cliente
     * GET /api/clients/{code}/agent-keys
     */
    public function index(Request $request, string $code): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $keys = AgentKey::where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'active', 'last_seen_at', 'last_ip', 'created_at']);

        return response()->json([
            'agent_keys' => $keys,
        ]);
    }

    /**
     * Generar nueva key
     * POST /api/clients/{code}/agent-keys
     */
    public function store(Request $request, string $code): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $keyData = AgentKey::generateForTenant($tenant->id, $validated['name']);

        return response()->json([
            'message' => 'Key generada exitosamente. Guárdela, no se mostrará de nuevo.',
            'agent_key' => $keyData,
        ], 201);
    }

    /**
     * Revocar key
     * DELETE /api/clients/{code}/agent-keys/{id}
     */
    public function destroy(Request $request, string $code, int $id): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $key = AgentKey::where('id', $id)
            ->where('tenant_id', $tenant->id)
            ->first();

        if (!$key) {
            return response()->json(['error' => 'Key no encontrada'], 404);
        }

        $key->revoke();

        return response()->json([
            'message' => 'Key revocada exitosamente',
        ]);
    }

    /**
     * Reactivar key
     * PATCH /api/clients/{code}/agent-keys/{id}/activate
     */
    public function activate(Request $request, string $code, int $id): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $tenant = Tenant::where('code', $code)->first();

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $key = AgentKey::where('id', $id)
            ->where('tenant_id', $tenant->id)
            ->first();

        if (!$key) {
            return response()->json(['error' => 'Key no encontrada'], 404);
        }

        $key->update(['active' => true]);

        return response()->json([
            'message' => 'Key activada exitosamente',
        ]);
    }
}
