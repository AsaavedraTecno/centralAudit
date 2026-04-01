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
        $config = $this->getAgentConfig($tenant, $agentKey);

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
            'last_seen_at' => now()->utc(),  
            'last_ip' => $request->ip(),
        ]);

        // Obtener configuración actualizada
        $config = $this->getAgentConfig($agentKey->tenant, $agentKey);

        // Obtener comandos pendientes (por ahora vacío, se puede implementar cola)
        $commands = $this->getPendingCommands($tenant);

        return response()->json([
            'success' => true,
            'config' => $config,
            'commands' => $commands,
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function config(Request $request): JsonResponse
    {
        $agentKey = $this->validateAgentKey($request);
        if (!$agentKey) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Obtener la data cruda desde tu función getAgentConfig
        $rawConfig = $this->getAgentConfig($agentKey->tenant, $agentKey);

        // 1. Array de objetos para 'ip_ranges' (Go struct: []scanner.IPRangeConfig)
        $rangosMultiples = $rawConfig['discovery']['ip_ranges'] ?? [];
        
        // 2. String simple para 'ip_range' (Go struct: string)
        $ipRangeString = $rawConfig['discovery']['ip_range'] ?? '';
        
        // 3. Convertir minutos a segundos
        $intervaloSegundos = ($rawConfig['scan_interval_minutes'] ?? 15) * 60;

        // 4. Validar si está activo
        $estaActivo = (count($rangosMultiples) > 0 || !empty($ipRangeString)) && ($rawConfig['discovery']['enabled'] ?? false);

        // 5. RESPUESTA EXACTA a las etiquetas de Go
        return response()->json([
            'active'         => $estaActivo,
            'ip_ranges'      => $rangosMultiples,   // Array de objetos: [{"ip_from": "x", "ip_to": "y"}]
            'ip_range'       => $ipRangeString,     // String simple: "192.168.1.1-192.168.1.254"
            'snmp_community' => $rawConfig['snmp_community'] ?? 'public',
            'snmp_version'   => $rawConfig['snmp_version'] ?? '2c',
            'scan_interval'  => $intervaloSegundos, 
            'max_concurrent' => 50
        ]);
    }

    public function telemetry(Request $request): JsonResponse
    {
        Log::info('📥 Telemetría recibida', ['payload' => $request->all()]);

        $agentKey = $this->validateAgentKey($request);
        if (!$agentKey) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $tenant = $agentKey->tenant;
        $events = $request->input('events', []);

        if (empty($events)) {
            Log::warning('⚠️ Telemetría vacía recibida');
            return response()->json(['success' => true]);
        }

        tenancy()->initialize($tenant);

        DB::connection('tenant')->beginTransaction();
        try {

            // Obtener o crear estado del agente
            
            $existingStatus = DB::connection('tenant')->table('agent_status')
                            ->where('agent_id', $agentKey->id)->first();

            $location = null;
            if ($existingStatus && $existingStatus->location_id) {
                $location = Location::find($existingStatus->location_id);
            }
            if (!$location) {
                $location = Location::first();
                if (!$location) {
                    $location = Location::create([
                        'nombre' => 'Sucursal Principal',
                        'activo' => true,
                        'direccion' => 'Generada Automáticamente',
                    ]);
                }
            }

            Log::info("📍 Sucursal asignada", [
                'location_id' => $location->id,
                'nombre' => $location->nombre
            ]);

            DB::connection('tenant')->table('agent_status')->updateOrInsert(
                ['agent_id' => $agentKey->id], 
                [
                    'location_id' => $location->id,
                    'status' => 'online',
                    'hostname'     => $agentSource['hostname'] ?? 'Unknown',
                    'version'      => $agentSource['version'] ?? '1.0.0',
                    'ip_address'   => $request->ip(),
                    'last_seen_at' => now()->utc(),
                    'updated_at' => now()->utc(),
                    // Si es insert, created_at debería manejarse, si no, puedes añadirlo:
                    // 'created_at' => now() // (opcional si la BD lo pone auto)
                ]
            );
            
            // RECUPERAMOS EL OBJETO ACTUALIZADO (Con el ID local correcto, ej: 1)
            $agentStatus = DB::connection('tenant')
                ->table('agent_status')
                ->where('agent_id', $agentKey->id)
                ->first();

            $processed = 0;
           
            foreach ($events as $index => $event) {
                // Logueamos el ID de hardware, que nunca es null (viene de Go)
                Log::info("Procesando índice $index", ["hw_id" => $event['printer']['id']]);

                try {
                    // 👇 LLAMADA REAL A LA FUNCIÓN DE GUARDADO
                    $this->processTelemetryEvent($location, $agentStatus, $event);
                    $processed++;
                } catch (\Throwable $e) {
                    Log::error('❌ Error guardando impresora', [
                        'index' => $index,
                        'hw_id' => $event['printer']['id'] ?? 'unknown',
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $agentKey->update([
                'last_seen_at' => now()->utc(),  

                //'last_ip' => $request->ip(),
            ]);
            DB::connection('tenant')->commit();
            return response()->json([
                'success' => true,
                'processed' => $processed,
                'location' => $location->nombre,
            ]);

        } catch (\Throwable $e) {
            DB::connection('tenant')->rollBack();

            Log::error('❌ Error general procesando telemetría', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error procesando telemetría',
            ], 500);
        } finally {
            tenancy()->end();
        }
    }


    /**
     * Procesar un evento de telemetría individual
     */
    private function processTelemetryEvent(Location $location, object $agentStatus, $event): bool 
    {
        // 1. Extraer datos del JSON (Payload)
        $pData        = $event['printer'] ?? [];
        $absData      = $event['counters']['absolute'] ?? [];
        $deltaData    = $event['counters']['delta'] ?? [];
        $suppliesData = $event['supplies'] ?? [];
        
        // Parsear fecha
        $collectedAt = isset($event['collected_at']) 
            ? Carbon::parse($event['collected_at'], 'UTC')
            : now()->utc();

        // 2. ID Único del Agente y variables de búsqueda
        $uniqueId = $pData['id'] ?? null;
        $macAddress = $pData['mac_address'] ?? null;
        $serialNumber = $pData['serial_number'] ?? null;

        if (!$uniqueId) {
            // Fallback de emergencia si el agente no manda ID
            $uniqueId = $serialNumber ?? $macAddress ?? $pData['ip'];
        }

        if (!$uniqueId) return false; // Si no hay forma de identificarla, salir.

        // 3. BÚSQUEDA INTELIGENTE Y ACTUALIZACIÓN (Upsert avanzado para evitar duplicados)
        $printer = null;

        // Intentar encontrarla por MAC Address en esta sucursal (La más precisa)
        if ($macAddress) {
            $printer = Printer::where('location_id', $location->id)
                              ->where('mac_address', $macAddress)
                              ->first();
        }

        // Si no la encontró por MAC, intentamos por Serial Number
        if (!$printer && $serialNumber) {
            $printer = Printer::where('location_id', $location->id)
                              ->where('serial_number', $serialNumber)
                              ->first();
        }

        // Último intento: por el ID antiguo que haya dejado el agente (asset_tag)
        if (!$printer) {
            $printer = Printer::where('asset_tag', $uniqueId)->first();
        }

        // Preparamos los datos frescos
        $printerData = [
            'agent_id'         => $agentStatus->id,
            'location_id'      => $location->id,
            'location'         => $pData['location'] ?? null,
            'hostname'         => $pData['hostname'] ?? null,
            'name'             => $pData['hostname'] ?? $pData['model'] ?? 'Printer',
            'model'            => $pData['model'] ?? 'Modelo Desconocido',
            'brand'            => $pData['brand'] ?? 'Generica',
            'serial_number'    => $serialNumber,
            'ip_address'       => $pData['ip'],
            'mac_address'      => $macAddress,
            'status'           => 'active', 
            'last_seen_at'     => $collectedAt,
            'asset_tag'        => $uniqueId, // Actualizamos al nuevo ID del agente
        ];

        // Decidimos si creamos o actualizamos
        if ($printer) {
            $printer->update($printerData);
            $isNew = false;
        } else {
            $printer = Printer::create($printerData);
            $isNew = true;
        }

        // 4. GUARDAR CONTADORES (Historial Inteligente)
        $hasActivity = ($deltaData['total_pages'] ?? 0) > 0;

        // Opcional: Actualizar 'last_counter_at' en la impresora
        if (!empty($absData)) {
            $printer->update(['last_counter_at' => $collectedAt]);
        }

        if ($isNew || $hasActivity) {
            PrinterCounter::create([
                'printer_id'   => $printer->id,
                'total_pages'  => $absData['total_pages'] ?? 0,
                'bw_pages'     => $absData['mono_pages'] ?? 0,  // Mapeo mono -> bw
                'color_pages'  => $absData['color_pages'] ?? 0,
                'scan_pages'    => $absData['scan_pages'] ?? 0,
                'copy_pages'    => $absData['copy_pages'] ?? 0,
                'fax_pages'     => $absData['fax_pages'] ?? 0,
                'engine_cycles' => $absData['engine_cycles'] ?? 0, 
                'collected_at'  => $collectedAt
            
            ]);
            
            Log::info("💾 Historial creado para {$uniqueId}. Delta: " . ($deltaData['total_pages'] ?? 0));
        }

        // Actualizar tabla de agregados (Promedios)
        if (!empty($deltaData) && ($deltaData['total_pages'] ?? 0) > 0) {
            $this->updateAggregates($printer, $deltaData, $collectedAt);
        }

        // 5. GUARDAR SUMINISTROS (Con Historial)
        if (!empty($suppliesData)) {
            foreach ($suppliesData as $supply) {
                $mappedType = $this->mapSupplyId($supply['id'] ?? 'unknown');

                $percentage = isset($supply['percentage']) ? (float) $supply['percentage'] : 0;
                $status = $supply['status'] ?? 'unknown';
                $name = $supply['name'] ?? null;
                $serialNumber = $supply['serial_number'] ?? null;
                $description = $supply['description'] ?? null;

                // 1. Buscamos la última lectura de este suministro
                $lastSupply = PrinterSupply::where('printer_id', $printer->id)
                    ->where('supply_type', $mappedType)
                    ->orderByDesc('read_at')
                    ->first();

                // 2. ¿Debemos insertar un nuevo registro?
                $shouldInsert = true;
                if ($lastSupply) {
                    $hoursSinceLastRead = $collectedAt->diffInHours($lastSupply->read_at);
                    if ($lastSupply->percentage == $percentage && $hoursSinceLastRead < 24) {
                        $shouldInsert = false; // No hay cambios hoy, no duplicamos data
                    }
                }

                if ($shouldInsert) {
                    PrinterSupply::create([
                        'printer_id'    => $printer->id,
                        'supply_type'   => $mappedType,
                        'name'          => $name,          
                        'percentage'    => $percentage,
                        'status'        => $status,
                        'serial_number' => $serialNumber,
                        'description'   => $description,   
                        'read_at'       => $collectedAt,
                    ]);
                } else {
                    // Actualizamos solo la fecha para saber que la vimos viva
                    $lastSupply->update(['read_at' => $collectedAt]);
                }
            }
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
            'scan_pages'    => $counters['scan_pages'] ?? 0,
            'copy_pages'    => $counters['copy_pages'] ?? 0,
            'engine_cycles' => $counters['engine_cycles'] ?? 0,
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
                'name' => $supply['name'] ?? null,
                'serial_number' => $supply['serial_number'] ?? null,
                'description' => $supply['description'] ?? null,
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
        $id = strtolower($agentId);
        if (str_contains($id, 'fuser'))    return 'fuser_unit';
        if (str_contains($id, 'waste'))    return 'waste_toner';
        if (str_contains($id, 'transfer')) return 'transfer_roller';
        if (str_contains($id, 'drum') || str_contains($id, 'imaging')) {
            // Si es un drum, buscamos su color específico
            if (str_contains($id, 'cyan'))    return 'drum_cyan';
            if (str_contains($id, 'magenta')) return 'drum_magenta';
            if (str_contains($id, 'yellow'))  return 'drum_yellow';
            return 'drum_black'; // Default para drum
        }

        // 2. Colores (Tóners e Tintas)
        if (str_contains($id, 'black'))   return 'toner_black';
        if (str_contains($id, 'cyan'))    return 'toner_cyan';
        if (str_contains($id, 'magenta')) return 'toner_magenta';
        if (str_contains($id, 'yellow'))  return 'toner_yellow';

        $mapping = [
            'black_toner' => 'toner_black',
            'magenta_toner' => 'toner_magenta',
            'cyan_toner' => 'toner_cyan',
            'yellow_toner' => 'toner_yellow',
            
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
            'transfer_belt' => 'transfer_belt',
            'waste_box' => 'waste_box',
            'waste_toner_box' => 'waste_box',
            'adf_roller' => 'adf_roller',
            'mp_roller' => 'mp_roller',
            'retard_pad' => 'retard_pad',
        ];

        return $mapping[$agentId] ?? $agentId;
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
                'last_seen_at' => now()->utc(),
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
        // 1. Obtener la llave plana del header
        $plainKey = $request->header('X-Agent-Key');

        if (!$plainKey) {
            Log::warning("Intento de acceso sin X-Agent-Key desde: " . $request->ip());
            return null;
        }

        // 2. Hashear la llave para buscarla en la BD
        $hashedKey = hash('sha256', $plainKey);

        // 3. Buscar en la tabla CENTRAL 'agent_keys'
        $agentKey = AgentKey::where('key_hash', $hashedKey)
            ->where('active', true)
            ->with('tenant') // Cargar la relación del Tenant inmediatamente
            ->first();

        if (!$agentKey) {
            Log::warning("Agent Key no encontrada en BD (Hash: $hashedKey)");
            return null;
        }

        if (!$agentKey->tenant) {
            Log::error("Agent Key ID {$agentKey->id} existe pero no tiene Tenant asignado.");
            return null;
        }

        return $agentKey;
    }
    /**
     * Obtener configuración del agente para un tenant
     */
    private function getAgentConfig(Tenant $tenant, AgentKey $agentKey): array
    {
        // 1. Inicializar contexto del Tenant
        tenancy()->initialize($tenant);

        // 2. Buscar la configuración en la tabla 'agent_status' usando el ID de la Key
        //    Recuerda: agent_status.agent_id es la FK lógica hacia agent_keys.id
        $configData = DB::table('agent_status')
            ->where('agent_id', $agentKey->id) 
            ->first();

        // Valores por defecto si este agente específico no ha sido configurado en el Wizard
        $defaults = [
            'agent_name' => $agentKey->name, // Nombre de la sucursal/agente
            'scan_interval_minutes' => 60,
            'discovery' => ['enabled' => false],
        ];

        if (!$configData) {
            return $defaults;
        }

        // 3. Buscar rangos activos vinculados a ESTE agente específico
        $ranges = DB::table('agent_ranges')
            ->where('agent_id', $configData->id) // FK a la tabla agent_status del tenant
            ->where('active', true)
            ->get();

        $ipRangesArray = $ranges->map(function ($range) {
            return [
                'ip_from' => $range->ip_from,
                'ip_to'   => $range->ip_to,
                'active'  => (bool) $range->active,
            ];
        })->toArray();
            
        // Formatear rango para Go
        $ipRangeString = "";
        if ($ranges->isNotEmpty()) {
            $r = $ranges->first();
            $ipRangeString = "{$r->ip_from}-{$r->ip_to}";
        }

        return [
            'agent_name' => $agentKey->name, // Útil para que el agente sepa su identidad
            'scan_interval_minutes' => $configData->scan_interval_minutes ?? 15,
            'snmp_community' => $configData->snmp_community,
            'snmp_version' => '2c',
            'discovery' => [
                'enabled' => !empty($ipRangeString),
                'ip_range' => $ipRangeString,
                'ip_ranges' => $ipRangesArray,
                'subnet_mask' => $ranges->first()->subnet_mask ?? '255.255.255.0'
            ],
            // Flags de recolección
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
                'brand' => $data['brand'] ?? null,
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
            'engine_cycles' => $counters['engine_cycles'] ?? 0,
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


    private function updateAggregates(Printer $printer, array $delta, Carbon $collectedAt): void
    {
        // 1. Mapeo de variables (Go envía 'mono_pages', BD usa 'bw_pages')
        $totalPages = $delta['total_pages'] ?? 0;
        $bwPages    = $delta['mono_pages'] ?? 0;
        $colorPages = $delta['color_pages'] ?? 0;
        $engineDelta = $delta['engine_cycles'] ?? 0;

        // Si no hay incremento real, salimos
        if ($totalPages <= 0 && $engineDelta <= 0) return;

        // ---------------------------------------------------------
        // A. AGREGADO DIARIO (daily_aggregates)
        // ---------------------------------------------------------
        $date = $collectedAt->format('Y-m-d');

        // Buscamos el registro de hoy, si no existe lo crea en 0
        // Asumiendo que tienes el modelo App\Models\Tenant\DailyAggregate
        $daily = \App\Models\Tenant\DailyAggregate::firstOrCreate(
            [
                'printer_id' => $printer->id,
                'date'       => $date
            ],
            [
                'total_pages' => 0,
                'bw_pages'    => 0,
                'color_pages' => 0,
                'engine_cycles' => 0
                // 'supplies_avg' => null // Omitimos avg por rendimiento ahora
            ]
        );

        // Usamos increment() que es atómico y seguro
        $daily->increment('total_pages', $totalPages); 
        $daily->increment('bw_pages', $bwPages);
        $daily->increment('color_pages', $colorPages);
        $daily->increment('engine_cycles', $engineDelta);

        // ---------------------------------------------------------
        // B. AGREGADO MENSUAL (monthly_aggregates)
        // ---------------------------------------------------------
        // Usamos el primer día del mes para agrupar
        $month = $collectedAt->copy()->startOfMonth()->format('Y-m-d');

        $monthly = \App\Models\Tenant\MonthlyAggregate::firstOrCreate(
            [
                'printer_id' => $printer->id,
                'month'      => $month
            ],
            [
                'total_pages' => 0,
                'bw_pages'    => 0,
                'color_pages' => 0,
                'engine_cycles' => 0
            ]
        );

        $monthly->increment('total_pages', $totalPages);
        $monthly->increment('bw_pages', $bwPages);
        $monthly->increment('color_pages', $colorPages);
        $monthly->increment('engine_cycles', $engineDelta);
        
        Log::info("📈 Agregados actualizados para Impresora {$printer->id} (Día: $date, +$totalPages pags)");
    }
}
