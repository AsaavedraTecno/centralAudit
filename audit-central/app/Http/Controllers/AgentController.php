<?php

namespace App\Http\Controllers;

use App\Models\AgentKey;
use App\Models\Tenant;
use App\Models\Tenant\Location;
use App\Models\Tenant\Printer;
use App\Models\Tenant\PrinterCounter;
use App\Models\Tenant\PrinterSupply;
use App\Models\Tenant\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AgentController extends Controller
{
    /**
     * Activar agente con key
     * POST /api/agent/activate
     * 
     * Headers: X-Agent-Key
     * Body: { client_code, agent_name?, agent_version? }
     */
    public function activate(Request $request): JsonResponse
    {
        $agentKey = $this->validateAgentKey($request);

        if (!$agentKey) {
            return response()->json([
                'success' => false,
                'error' => 'Key inválida o revocada',
            ], 401);
        }

        $tenant = $agentKey->tenant;

        // Obtener configuración inicial del agente
        $config = $this->getAgentConfig($tenant);

        Log::info("Agente activado para cliente: {$tenant->code}", [
            'agent_key_id' => $agentKey->id,
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agente activado correctamente',
            'client' => [
                'code' => $tenant->code,
                'nombre' => $tenant->nombre,
            ],
            'config' => $config,
        ]);
    }

    /**
     * Check-in periódico del agente
     * POST /api/agent/checkin
     * 
     * Headers: X-Agent-Key
     * Body: { client_code, agent_version?, status?, last_scan_at? }
     */
    public function checkin(Request $request): JsonResponse
    {
        $agentKey = $this->validateAgentKey($request);

        if (!$agentKey) {
            return response()->json([
                'success' => false,
                'error' => 'Key inválida o revocada',
            ], 401);
        }

        $tenant = $agentKey->tenant;

        // Registrar check-in
        $agentKey->update([
            'last_seen_at' => now(),
            'last_ip' => $request->ip(),
        ]);

        // Obtener configuración actualizada
        $config = $this->getAgentConfig($tenant);

        // Obtener comandos pendientes (por ahora vacío, se puede implementar cola)
        $commands = $this->getPendingCommands($tenant);

        return response()->json([
            'success' => true,
            'config' => $config,
            'commands' => $commands,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    /**
     * Recibir telemetría del agente Go (batch de eventos)
     * POST /api/agent/telemetry
     * 
     * Headers: X-Agent-Key
     * Body: {
     *   client_code: "ACME",
     *   events: [
     *     {
     *       schema_version: "1.0.0",
     *       collected_at: "2025-12-23T15:47:20Z",
     *       source: { agent_id: "AGT-001", hostname: "server-01", os: "windows" },
     *       printer: { id: "...", ip: "192.168.150.17", brand: "Samsung", model: "...", serial: "..." },
     *       status: { state: "idle", page_count: 14372 },
     *       counters: { total_pages: 14372, mono_pages: 600, color_pages: 600 },
     *       supplies: [ { id: "toner_black", name: "Black Toner", level: 85 } ],
     *       metrics: { polling: { response_time_ms: 1693 } }
     *     }
     *   ]
     * }
     */
    public function telemetry(Request $request): JsonResponse
    {
        $agentKey = $this->validateAgentKey($request);

        if (!$agentKey) {
            return response()->json([
                'success' => false,
                'error' => 'Key inválida o revocada',
            ], 401);
        }

        $tenant = $agentKey->tenant;
        $events = $request->input('events', []);

        if (empty($events)) {
            return response()->json([
                'success' => true,
                'message' => 'Sin eventos para procesar',
                'processed' => 0,
            ]);
        }

        // Inicializar tenant para operaciones de BD
        tenancy()->initialize($tenant);

        try {
            DB::connection('tenant')->beginTransaction();

            // Obtener o crear location por defecto
            $location = Location::firstOrCreate(
                ['code' => 'default'],
                ['name' => 'Ubicación Principal', 'is_active' => true]
            );

            $processed = 0;
            $errors = [];

            foreach ($events as $event) {
                try {
                    $result = $this->processTelemetryEvent($location, $event);
                    if ($result) {
                        $processed++;
                    }
                } catch (\Exception $e) {
                    $printerId = $event['printer']['id'] ?? $event['printer']['ip'] ?? 'unknown';
                    $errors[] = [
                        'printer' => $printerId,
                        'error' => $e->getMessage(),
                    ];
                    Log::warning("Error procesando telemetría: " . $e->getMessage());
                }
            }

            DB::connection('tenant')->commit();

            // Actualizar timestamp del agente
            $agentKey->update([
                'last_seen_at' => now(),
                'last_ip' => $request->ip(),
            ]);

            Log::info("Telemetría procesada para {$tenant->code}: {$processed} eventos", [
                'agent_key_id' => $agentKey->id,
                'source' => $events[0]['source']['agent_id'] ?? 'unknown',
            ]);

            return response()->json([
                'success' => true,
                'message' => "Telemetría procesada",
                'processed' => $processed,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            Log::error("Error en telemetry: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar telemetría',
            ], 500);
        } finally {
            tenancy()->end();
        }
    }

    /**
     * Procesar un evento de telemetría individual
     */
    private function processTelemetryEvent(Location $location, array $event): bool
    {
        $printerData = $event['printer'] ?? [];
        $countersData = $event['counters']['absolute'] ?? $event['counters'] ?? [];
        $suppliesData = $event['supplies'] ?? [];
        $statusData = $event['status'] ?? [];
        $collectedAt = isset($event['collected_at']) 
            ? Carbon::parse($event['collected_at']) 
            : now();

        // Necesitamos al menos IP o serial para identificar la impresora
        $ip = $printerData['ip'] ?? null;
        $serial = $printerData['serial_number'] ?? $printerData['serial'] ?? null;

        if (!$ip && !$serial) {
            return false;
        }

        // Buscar impresora por serial o IP
        $printer = null;
        if ($serial) {
            $printer = Printer::where('serial_number', $serial)->first();
        }
        if (!$printer && $ip) {
            $printer = Printer::where('ip_address', $ip)->first();
        }

        // Crear o actualizar impresora
        $printerFields = [
            'location_id' => $location->id,
            'ip_address' => $ip,
            'manufacturer' => $printerData['brand'] ?? $printerData['manufacturer'] ?? null,
            'model' => $printerData['model'] ?? null,
            'name' => $printerData['hostname'] ?? $printerData['model'] ?? $printerData['brand'] ?? "Printer {$ip}",
            'status' => $this->mapStatus($statusData['state'] ?? 'unknown'),
            'last_seen_at' => $collectedAt,
        ];

        if ($serial) {
            $printerFields['serial_number'] = $serial;
        }

        if ($printer) {
            $printer->update($printerFields);
        } else {
            $printer = Printer::create(array_merge($printerFields, [
                'serial_number' => $serial ?? 'IP-' . str_replace('.', '-', $ip),
            ]));
        }

        // Guardar contadores si vienen
        if (!empty($countersData)) {
            $this->saveTelemetryCounters($printer, $countersData, $collectedAt);
        }

        // Guardar supplies si vienen (formato array de objetos)
        if (!empty($suppliesData)) {
            $this->saveTelemetrySupplies($printer, $suppliesData, $collectedAt);
        }

        return true;
    }

    /**
     * Guardar contadores desde telemetría
     */
    private function saveTelemetryCounters(Printer $printer, array $counters, Carbon $collectedAt): void
    {
        PrinterCounter::create([
            'printer_id' => $printer->id,
            'total_pages' => $counters['total_pages'] ?? $counters['page_count'] ?? 0,
            'bw_pages' => $counters['mono_pages'] ?? $counters['bw_pages'] ?? 0,
            'color_pages' => $counters['color_pages'] ?? 0,
            'collected_at' => $collectedAt,
        ]);
    }

    /**
     * Guardar supplies desde telemetría (formato array de objetos)
     * Input: [{ id: "toner_black", name: "Black Toner", level: 85 }, ...]
     *    o: [{ id: "black_toner_cartridge", percentage: 85, ... }, ...]
     */
    private function saveTelemetrySupplies(Printer $printer, array $supplies, Carbon $collectedAt): void
    {
        // Guardar cada suministro como un registro separado (normalizado)
        foreach ($supplies as $supply) {
            $supplyType = $supply['id'] ?? $supply['type'] ?? null;
            $level = $supply['percentage'] ?? $supply['level'] ?? null;
            
            if (!$supplyType || $level === null) {
                continue;
            }
            
            // Mapear IDs del agente a nuestros nombres
            $mappedType = $this->mapSupplyId($supplyType);
            if (!$mappedType) {
                continue;
            }
            
            // Determinar estado basado en porcentaje
            $status = $this->getSupplyStatus((int) $level);
            
            // Guardar como registro individual (normalizado)
            PrinterSupply::create([
                'printer_id' => $printer->id,
                'supply_type' => $mappedType,
                'percentage' => (int) $level,
                'status' => $status,
                'read_at' => $collectedAt,
            ]);
        }
        
        // Verificar alertas por supplies bajos
        $this->checkTelemetryAlerts($printer);
    }

    /**
     * Determinar estado del suministro
     */
    private function getSupplyStatus(int $percentage): string
    {
        if ($percentage <= 0) {
            return 'empty';
        } elseif ($percentage <= 5) {
            return 'critical';
        } elseif ($percentage <= 15) {
            return 'low';
        }
        return 'ok';
    }

    /**
     * Mapear IDs de supplies del agente a nuestros nombres
     */
    private function mapSupplyId(string $agentId): ?string
    {
        $mapping = [
            'black_toner_cartridge' => 'toner_black',
            'cyan_toner_cartridge' => 'toner_cyan',
            'magenta_toner_cartridge' => 'toner_magenta',
            'yellow_toner_cartridge' => 'toner_yellow',
            'black_imaging_unit' => 'drum_black',
            'cyan_imaging_unit' => 'drum_cyan',
            'magenta_imaging_unit' => 'drum_magenta',
            'yellow_imaging_unit' => 'drum_yellow',
            'fuser' => 'fusor',
            'transfer_roller' => 'transfer_roller',
            'transfer_belt' => 'transfer_roller',
            'waste_box' => 'waste_box',
            'waste_toner_box' => 'waste_box',
            'adf_roller' => 'adf_roller',
            'mp_roller' => 'mp_roller',
            'retard_pad' => 'retard_pad',
        ];

        return $mapping[$agentId] ?? null;
    }

    /**
     * Verificar y crear alertas desde telemetría
     */
    private function checkTelemetryAlerts(Printer $printer): void
    {
        // Obtener último registro de cada tipo de suministro
        $supplies = PrinterSupply::where('printer_id', $printer->id)
            ->latest('read_at')
            ->get()
            ->groupBy('supply_type')
            ->map(function ($group) {
                return $group->first(); // Último por supply_type
            });

        $alertThresholds = [
            'toner_black' => ['threshold' => 10, 'code' => 'LOW_TONER_BLACK'],
            'toner_cyan' => ['threshold' => 10, 'code' => 'LOW_TONER_CYAN'],
            'toner_magenta' => ['threshold' => 10, 'code' => 'LOW_TONER_MAGENTA'],
            'toner_yellow' => ['threshold' => 10, 'code' => 'LOW_TONER_YELLOW'],
            'drum_black' => ['threshold' => 15, 'code' => 'LOW_DRUM'],
            'drum_cyan' => ['threshold' => 15, 'code' => 'LOW_DRUM_CYAN'],
            'fusor' => ['threshold' => 10, 'code' => 'LOW_FUSER'],
            'waste_box' => ['threshold' => 90, 'code' => 'WASTE_BOX_FULL', 'inverse' => true],
            'transfer_roller' => ['threshold' => 15, 'code' => 'LOW_TRANSFER_ROLLER'],
        ];

        foreach ($alertThresholds as $supplyType => $config) {
            $supply = $supplies->get($supplyType);

            if (!$supply) {
                continue;
            }

            $isLow = isset($config['inverse']) 
                ? $supply->percentage >= $config['threshold']
                : $supply->percentage <= $config['threshold'];

            $existingAlert = Alert::where('printer_id', $printer->id)
                ->where('code', $config['code'])
                ->whereNull('cleared_at')
                ->first();

            if ($isLow && !$existingAlert) {
                Alert::create([
                    'printer_id' => $printer->id,
                    'code' => $config['code'],
                    'severity' => $supply->percentage <= 5 ? 'critical' : 'warn',
                    'message' => "{$supply->getSupplyTypeLabel()} al {$supply->percentage}%",
                    'raised_at' => now(),
                ]);
            } elseif (!$isLow && $existingAlert) {
                $existingAlert->update(['cleared_at' => now()]);
            }
        }
    }

    /**
     * Mapear estado del agente a nuestro formato
     */
    private function mapStatus(string $state): string
    {
        return match (strtolower($state)) {
            'idle', 'ready' => 'online',
            'printing', 'processing' => 'printing',
            'offline', 'unreachable' => 'offline',
            'error', 'fault' => 'error',
            'warning' => 'warning',
            default => 'unknown',
        };
    }

    /**
     * Sincronizar datos de impresoras (formato legacy/alternativo)
     * POST /api/agent/sync
     */
    public function sync(Request $request): JsonResponse
    {
        $agentKey = $this->validateAgentKey($request);

        if (!$agentKey) {
            return response()->json([
                'success' => false,
                'error' => 'Key inválida o revocada',
            ], 401);
        }

        $tenant = $agentKey->tenant;
        $printers = $request->input('printers', []);
        $locationCode = $request->input('location_code');

        if (empty($printers)) {
            return response()->json([
                'success' => true,
                'message' => 'Sin datos para sincronizar',
                'synced' => 0,
            ]);
        }

        // Inicializar tenant para operaciones de BD
        tenancy()->initialize($tenant);

        try {
            DB::connection('tenant')->beginTransaction();

            // Obtener o crear location por defecto si no se especifica
            $location = null;
            if ($locationCode) {
                $location = Location::where('code', $locationCode)->first();
            }
            if (!$location) {
                $location = Location::firstOrCreate(
                    ['code' => 'default'],
                    ['name' => 'Ubicación Principal', 'is_active' => true]
                );
            }

            $synced = 0;
            $errors = [];

            foreach ($printers as $printerData) {
                try {
                    $result = $this->syncPrinter($location, $printerData);
                    if ($result) {
                        $synced++;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'serial' => $printerData['serial_number'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ];
                    Log::warning("Error sincronizando impresora: " . $e->getMessage());
                }
            }

            DB::connection('tenant')->commit();

            // Actualizar timestamp del agente
            $agentKey->update([
                'last_seen_at' => now(),
                'last_ip' => $request->ip(),
            ]);

            Log::info("Sync completado para {$tenant->code}: {$synced} impresoras", [
                'agent_key_id' => $agentKey->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Sincronización completada",
                'synced' => $synced,
                'errors' => $errors,
            ]);

        } catch (\Exception $e) {
            DB::connection('tenant')->rollBack();
            Log::error("Error en sync: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Error al sincronizar datos',
            ], 500);
        } finally {
            tenancy()->end();
        }
    }

    /**
     * Validar Agent Key desde el request
     */
    private function validateAgentKey(Request $request): ?AgentKey
    {
        $key = $request->header('X-Agent-Key');
        $clientCode = $request->input('client_code');

        if (!$key || !$clientCode) {
            return null;
        }

        return AgentKey::verify($clientCode, $key);
    }

    /**
     * Obtener configuración del agente para un tenant
     */
    private function getAgentConfig(Tenant $tenant): array
    {
        // Por ahora configuración por defecto
        // TODO: Guardar configuración por tenant en BD
        return [
            'scan_interval_minutes' => 15,
            'scan_subnets' => [], // El agente puede auto-detectar o configurarse manualmente
            'snmp_community' => 'public',
            'snmp_version' => '2c',
            'collect_counters' => true,
            'collect_supplies' => true,
            'collect_alerts' => true,
            'timeout_seconds' => 5,
            'retry_count' => 2,
        ];
    }

    /**
     * Obtener comandos pendientes para el agente
     */
    private function getPendingCommands(Tenant $tenant): array
    {
        // TODO: Implementar cola de comandos (scan_now, restart, update_config, etc.)
        return [];
    }

    /**
     * Sincronizar una impresora individual
     */
    private function syncPrinter(Location $location, array $data): bool
    {
        $serialNumber = $data['serial_number'] ?? null;
        
        if (!$serialNumber) {
            return false;
        }

        // Buscar o crear impresora
        $printer = Printer::updateOrCreate(
            ['serial_number' => $serialNumber],
            [
                'location_id' => $location->id,
                'ip_address' => $data['ip_address'] ?? null,
                'mac_address' => $data['mac_address'] ?? null,
                'hostname' => $data['hostname'] ?? null,
                'manufacturer' => $data['manufacturer'] ?? null,
                'model' => $data['model'] ?? null,
                'name' => $data['name'] ?? $data['model'] ?? "Printer {$serialNumber}",
                'firmware_version' => $data['firmware'] ?? null,
                'is_color' => $data['is_color'] ?? false,
                'status' => $data['status'] ?? 'unknown',
                'last_seen_at' => now(),
            ]
        );

        // Guardar contadores si vienen
        if (!empty($data['counters'])) {
            $this->saveCounters($printer, $data['counters']);
        }

        // Guardar supplies si vienen
        if (!empty($data['supplies'])) {
            $this->saveSupplies($printer, $data['supplies']);
        }

        // Generar alertas automáticas por supplies bajos
        if (!empty($data['supplies'])) {
            $this->checkAndCreateAlerts($printer, $data['supplies']);
        }

        return true;
    }

    /**
     * Guardar contadores de impresora
     */
    private function saveCounters(Printer $printer, array $counters): void
    {
        PrinterCounter::create([
            'printer_id' => $printer->id,
            'total_pages' => $counters['total_pages'] ?? 0,
            'bw_pages' => $counters['bw_pages'] ?? 0,
            'color_pages' => $counters['color_pages'] ?? 0,
            'copy_pages' => $counters['copy_pages'] ?? null,
            'print_pages' => $counters['print_pages'] ?? null,
            'scan_pages' => $counters['scan_pages'] ?? null,
            'fax_pages' => $counters['fax_pages'] ?? null,
            'duplex_pages' => $counters['duplex_pages'] ?? null,
            'read_at' => now(),
        ]);
    }

    /**
     * Guardar supplies de impresora
     */
    private function saveSupplies(Printer $printer, array $supplies): void
    {
        PrinterSupply::create([
            'printer_id' => $printer->id,
            'toner_black' => $supplies['toner_black'] ?? null,
            'toner_cyan' => $supplies['toner_cyan'] ?? null,
            'toner_magenta' => $supplies['toner_magenta'] ?? null,
            'toner_yellow' => $supplies['toner_yellow'] ?? null,
            'drum_black' => $supplies['drum_black'] ?? null,
            'drum_cyan' => $supplies['drum_cyan'] ?? null,
            'drum_magenta' => $supplies['drum_magenta'] ?? null,
            'drum_yellow' => $supplies['drum_yellow'] ?? null,
            'fuser_unit' => $supplies['fuser_unit'] ?? null,
            'transfer_belt' => $supplies['transfer_belt'] ?? null,
            'waste_toner' => $supplies['waste_toner'] ?? null,
            'maintenance_kit' => $supplies['maintenance_kit'] ?? null,
            'read_at' => now(),
        ]);
    }

    /**
     * Verificar y crear alertas por supplies bajos
     */
    private function checkAndCreateAlerts(Printer $printer, array $supplies): void
    {
        $alertThresholds = [
            'toner_black' => ['threshold' => 10, 'code' => Alert::CODE_LOW_TONER_BLACK],
            'toner_cyan' => ['threshold' => 10, 'code' => Alert::CODE_LOW_TONER_CYAN],
            'toner_magenta' => ['threshold' => 10, 'code' => Alert::CODE_LOW_TONER_MAGENTA],
            'toner_yellow' => ['threshold' => 10, 'code' => Alert::CODE_LOW_TONER_YELLOW],
            'drum_black' => ['threshold' => 15, 'code' => Alert::CODE_LOW_DRUM],
            'fuser_unit' => ['threshold' => 10, 'code' => Alert::CODE_LOW_FUSER],
            'waste_toner' => ['threshold' => 90, 'code' => Alert::CODE_WASTE_BOX_FULL, 'inverse' => true],
        ];

        foreach ($alertThresholds as $supply => $config) {
            if (!isset($supplies[$supply])) {
                continue;
            }

            $value = $supplies[$supply];
            $isLow = isset($config['inverse']) 
                ? $value >= $config['threshold']  // waste_toner: alerta si >= 90%
                : $value <= $config['threshold']; // toners: alerta si <= 10%

            // Buscar alerta activa existente
            $existingAlert = Alert::where('printer_id', $printer->id)
                ->where('code', $config['code'])
                ->whereNull('cleared_at')
                ->first();

            if ($isLow && !$existingAlert) {
                // Crear nueva alerta
                Alert::create([
                    'printer_id' => $printer->id,
                    'code' => $config['code'],
                    'severity' => $value <= 5 ? Alert::SEVERITY_ERROR : Alert::SEVERITY_WARN,
                    'message' => "{$supply} al {$value}%",
                    'raised_at' => now(),
                ]);
            } elseif (!$isLow && $existingAlert) {
                // Limpiar alerta si ya no aplica
                $existingAlert->update(['cleared_at' => now()]);
            }
        }
    }
}
