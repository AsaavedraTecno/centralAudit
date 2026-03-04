<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\AgentKey;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AgentConfigurationController extends Controller
{
    /**
     * Obtener la configuración actual del agente para mostrar en el Mantenedor
     */
    public function show(string $code, string $agentKeyId): JsonResponse
    {
        $tenant = Tenant::where('code', $code)->firstOrFail();
        tenancy()->initialize($tenant);

        try {
            // Buscamos el estado del agente
            $status = DB::table('agent_status')->where('agent_id', $agentKeyId)->first();
            
            if (!$status) {
                return response()->json(['message' => 'Agente no configurado aún'], 404);
            }

            // Buscamos TODOS los rangos de IP (pueden ser múltiples)
            $ranges = DB::table('agent_ranges')
                ->where('agent_id', $status->id)
                ->orderBy('id', 'asc')
                ->get();

            // Contamos impresoras descubiertas
            $printersCount = DB::table('printers')->count();

            // Calcular IPs totales de todos los rangos
            $totalIps = 0;
            foreach ($ranges as $range) {
                $start = ip2long($range->ip_from);
                $end = ip2long($range->ip_to);
                $totalIps += abs($end - $start) + 1;
            }

            // Transformar rangos al formato que el frontend espera
            $ipRanges = $ranges->map(function ($range) {
                return [
                    'id'            => $range->id,
                    'agent_id'      => $range->agent_id,
                    'ip_from'       => $range->ip_from,
                    'ip_to'         => $range->ip_to,
                    'subnet_mask'   => $range->subnet_mask,
                    'ips_to_scan'   => $range->ips_to_scan,
                    'active'        => (bool) $range->active,
                ];
            })->toArray();

            $data = [
                'agent_key_id'   => (int) $agentKeyId,
                
                // --- DATOS DEL FORMULARIO (Editables) ---
                'snmp_community' => $status->snmp_community,
                'scan_interval'  => $status->scan_interval_minutes ?? 15,
                
                // NUEVO: Array de múltiples rangos
                'ip_ranges'      => $ipRanges,
                
                // DEPRECATED: Para compatibilidad con código antiguo
                'ip_from'        => $ranges->count() > 0 ? $ranges[0]->ip_from : '',
                'ip_to'          => $ranges->count() > 0 ? $ranges[0]->ip_to : '',
                'subnet_mask'    => $ranges->count() > 0 ? $ranges[0]->subnet_mask : '255.255.255.0',

                // --- DATOS INFORMATIVOS (Solo lectura para las tarjetas) ---
                'hostname'       => $status->hostname ?? 'Desconocido',
                'ip_address'     => $status->ip_address ?? '---',
                'agent_version'  => $status->version ?? 'v1.0',
                'status'         => $status->status ?? 'offline',
                'last_seen_at'   => $status->last_seen_at,
                
                // Métricas
                'ips_to_scan'       => $totalIps,
                'printers_count'    => $printersCount
            ];

            return response()->json($data);

        } finally {
            tenancy()->end();
        }
    }

    /**
     * Guardar o Actualizar configuración con MÚLTIPLES RANGOS DE IP
     * Usado por Wizard y Mantenedor
     */
    public function store(Request $request, string $code): JsonResponse
    {
        $tenant = Tenant::where('code', $code)->firstOrFail();

        // Validación: Aceptar tanto formato nuevo (ip_ranges[]) como antiguo (ip_from, ip_to)
        $validated = $request->validate([
            'agent_key_id'   => 'required|integer',
            'snmp_community' => 'required|string|max:50',
            'scan_interval'  => 'required|integer|min:1',
            
            // Nuevo formato: array de rangos
            'ip_ranges'      => 'sometimes|array|min:1',
            'ip_ranges.*.ip_from'       => 'required_with:ip_ranges|ipv4',
            'ip_ranges.*.ip_to'         => 'required_with:ip_ranges|ipv4',
            'ip_ranges.*.subnet_mask'   => 'required_with:ip_ranges|ipv4',
            'ip_ranges.*.active'        => 'sometimes|boolean',
            
        ]);

        // Verificar que la Key pertenezca al Tenant (seguridad)
        $keyExists = AgentKey::where('id', $validated['agent_key_id'])
            ->where('tenant_id', $tenant->id)
            ->exists();

        if (!$keyExists) {
            return response()->json(['error' => 'La llave de agente no pertenece a este cliente'], 403);
        }

        // Si viene en formato antiguo, convertirlo a nuevo
        if (empty($validated['ip_ranges'])) {
            if (!isset($validated['ip_from']) || !isset($validated['ip_to'])) {
                return response()->json(['error' => 'Debe proporcionar al menos un rango de IP'], 400);
            }

            $validated['ip_ranges'] = [[
                'ip_from'     => $validated['ip_from'],
                'ip_to'       => $validated['ip_to'],
                'subnet_mask' => $validated['subnet_mask'] ?? '255.255.255.0',
                'active'      => true,
            ]];
        }

        // Entrar a la DB del Tenant
        tenancy()->initialize($tenant);

        try {
            DB::connection('tenant')->beginTransaction();

            // 1. Actualizar o crear agent_status
            $existingAgent = DB::table('agent_status')
                ->where('agent_id', $validated['agent_key_id'])
                ->first();

            $agentRecordId = null;

            if ($existingAgent) {
                // UPDATE
                DB::table('agent_status')
                    ->where('id', $existingAgent->id)
                    ->update([
                        'snmp_community'        => $validated['snmp_community'],
                        'scan_interval_minutes' => $validated['scan_interval'],
                        'updated_at'            => now(),
                    ]);
                
                $agentRecordId = $existingAgent->id;

            } else {
                // INSERT
                $agentRecordId = DB::table('agent_status')->insertGetId([
                    'agent_id'              => $validated['agent_key_id'],
                    'snmp_community'        => $validated['snmp_community'],
                    'scan_interval_minutes' => $validated['scan_interval'],
                    'hostname'              => 'PENDING_SETUP', 
                    'status'                => 'offline',
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);
            }

            // 2. Guardar MÚLTIPLES RANGOS DE IP
            // Primero, eliminar los rangos anteriores
            DB::table('agent_ranges')->where('agent_id', $agentRecordId)->delete();

            // Luego, insertar los nuevos rangos
            foreach ($validated['ip_ranges'] as $range) {
                // Calcular cantidad de IPs
                $start = ip2long($range['ip_from']);
                $end = ip2long($range['ip_to']);
                $totalIps = abs($end - $start) + 1;

                DB::table('agent_ranges')->insert([
                    'agent_id'    => $agentRecordId,
                    'ip_from'     => $range['ip_from'],
                    'ip_to'       => $range['ip_to'],
                    'subnet_mask' => $range['subnet_mask'],
                    'ips_to_scan' => $totalIps,                
                    'active'      => $range['active'] ?? true,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }

            DB::connection('tenant')->commit();

            return response()->json([
                'success' => true,
                'message' => 'Configuración guardada exitosamente.',
                'ranges_saved' => count($validated['ip_ranges']),
            ]);

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            return response()->json(
                ['error' => 'Error al guardar configuración: ' . $e->getMessage()], 
                500
            );
        } finally {
            tenancy()->end();
        }
    }
}