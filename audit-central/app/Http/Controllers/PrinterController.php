<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Printer;
use App\Models\Tenant\Location;
use App\Models\Tenant; 
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str; 
use Stancl\Tenancy\Facades\Tenancy;

class PrinterController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Helper privado para encontrar el Tenant sin romper la base de datos.
     * Soluciona el error SQL: "invalid text representation for uuid"
     */
    private function resolveTenant(string $code)
    {
        // 1. Si el código es un UUID válido (ej: 16ff531e...), buscamos por ID
        if (Str::isUuid($code)) {
            return Tenant::where('id', $code)->first();
        }

        // 2. Si es texto (ej: "prueba-agent"), buscamos por slug/id string si existiera, o retornamos null.
        // Esto evita que Postgres explote al comparar texto con una columna UUID.
        return Tenant::where('code', $code)->first();
    }

    public function index(Request $request, string $code, int $locationId): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $printers = $this->tenantContext->run($tenant, function () use ($locationId, $request) {
            $location = Location::find($locationId);

            if (!$location) {
                return null;
            }
            $query = Printer::where('location_id', $locationId);
                if ($request->has('only_active')) {
                    $query->where('status', 'active');
                }

                return $query->with([
                    'latestCounter',
                    'firstCounterToday',
                    'firstCounterThisMonth',
                    'lastCounterYesterday',
                    'supplies' => fn($q) => $q->where('read_at', '>=', now()->subDays(5))->orderBy('read_at', 'desc'),
                    'activeAlerts'
                ])
                ->orderBy('name')
                ->get()
                ->map(fn($printer) => $this->formatPrinterResponse($printer));
        });

        if ($printers === null) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json(['impresoras' => $printers]);
    }

    public function show(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = Tenant::where('code', $code)->firstOrFail();

        Tenancy::initialize($tenant);

        try {
            $printer = Printer::where('location_id', $locationId)
                ->where('id', $id)
                ->with([
                    'latestCounter', 
                    'firstCounterToday',      
                    'lastCounterYesterday',  
                    'firstCounterThisMonth',
                    'supplies' => fn($q) => $q->limit(50)->orderBy('read_at', 'desc'),
                    'activeAlerts', 
                    'location'
                ])
                ->first();

            if (!$printer) {
                return response()->json(['error' => 'Impresora no encontrada'], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $this->formatPrinterResponse($printer, true),
            ]);

        } finally {
            Tenancy::end();
        }
    }

    public function counters(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = $this->resolveTenant($code);
        if (!$tenant) return response()->json(['error' => 'Cliente no encontrado'], 404);

        $days = $request->input('days', 30);

        $counters = $this->tenantContext->run($tenant, function () use ($id, $days) {
            $printer = Printer::find($id);
            if (!$printer) return null;

            return $printer->counters()
                ->where('collected_at', '>=', now()->subDays($days))
                ->orderBy('collected_at', 'desc')
                ->get();
        });

        if ($counters === null) return response()->json(['error' => 'Impresora no encontrada'], 404);

        return response()->json(['counters' => $counters]);
    }

    public function supplies(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = $this->resolveTenant($code);
        if (!$tenant) return response()->json(['error' => 'Cliente no encontrado'], 404);

        $days = $request->input('days', 30);

        $supplies = $this->tenantContext->run($tenant, function () use ($id, $days) {
            $printer = Printer::find($id);
            if (!$printer) return null;

            return $printer->supplies()
                ->where('read_at', '>=', now()->subDays($days))
                ->orderBy('read_at', 'desc')
                ->get();
        });

        if ($supplies === null) return response()->json(['error' => 'Impresora no encontrada'], 404);

        return response()->json(['supplies' => $supplies]);
    }

    private function formatPrinterResponse(Printer $printer, bool $includeDetails = false): array
    {
        $counter = $printer->latestCounter;

        // ESTADO DE CONEXIÓN
        $lastSeen = $printer->last_seen_at
            ? $printer->last_seen_at->copy()->utc()
            : null;

        $now = now()->utc();

        $minutesOffline = $lastSeen
            ? abs($now->diffInMinutes($lastSeen))
            : null;

        $connectionColor = 'green';

        if ($minutesOffline !== null) {

            if ($minutesOffline > 30) {
                $connectionColor = 'red';
            } elseif ($minutesOffline > 10) {
                $connectionColor = 'yellow';
            }

        }

        $impHoyBN = 0; $impHoyColor = 0; $impHoyMotor = 0; // Hoy
        $impMesBN = 0; $impMesColor = 0; $impMesMotor = 0; // Mes

        if ($counter) {

            // ===== HOY =====
            $refHoy = $printer->lastCounterYesterday ?: $printer->firstCounterToday;

            if ($refHoy) {
                $impHoyBN    = max(0, $counter->bw_pages - $refHoy->bw_pages);
                $impHoyColor = max(0, $counter->color_pages - $refHoy->color_pages);
                $impHoyMotor = max(0, $counter->engine_cycles - $refHoy->engine_cycles);
                $impHoyCopia = max(0, $counter->copy_pages - $refHoy->copy_pages);
            }

            // ===== MES =====

            if ($printer->firstCounterThisMonth) {

                $impMesBN = max(0, $counter->bw_pages - $printer->firstCounterThisMonth->bw_pages);
                $impMesColor = max(0, $counter->color_pages - $printer->firstCounterThisMonth->color_pages);
                $impMesMotor = max(0, $counter->engine_cycles - $printer->firstCounterThisMonth->engine_cycles);

            }
        }

        // Obtenemos mapa de suministros
        $suppliesMap = $printer->supplies
            ->sortByDesc('read_at')
            ->unique('supply_type')
            ->pluck('percentage', 'supply_type')
            ->toArray();

        $findSmart = function(array $mustHave, array $mustNotHave = []) use ($suppliesMap) {
            foreach ($suppliesMap as $type => $percent) {
                $typeLower = strtolower($type);
                $hasAll = true;
                foreach ($mustHave as $word) {
                    if (!str_contains($typeLower, strtolower($word))) {
                        $hasAll = false;
                        break;
                    }
                }
                $hasForbidden = false;
                foreach ($mustNotHave as $word) {
                    if (str_contains($typeLower, strtolower($word))) {
                        $hasForbidden = true;
                        break;
                    }
                }
                if ($hasAll && !$hasForbidden) {
                    return $percent; 
                }
            }
            return null; 
        };


        $response = [
            'id' => $printer->id,
            'internal_id' => $printer->internal_id, 
            'brand' => $printer->brand,
            'nombre' => $printer->name,
            'modelo' => $printer->model,
            'serie' => $printer->serial_number,
            'ip' => $printer->ip_address,
            'estado' => $printer->status === 'active' ? 1 : 0,
            'ubicacion' => $printer->location, 
            'descripcion' => $printer->description,

            'secondary_serial' => $printer->secondary_serial,
            'custom_location'  => $printer->custom_location,
            'comments'         => $printer->comments,
            'custom_field_1'   => $printer->custom_field_1,
            'custom_field_2'   => $printer->custom_field_2,
            'mac'              => $printer->mac_address,
            'firmware'         => $printer->firmware_version,

            'last_seen_at' => $lastSeen?->Timezone('America/Santiago')->toIso8601String(),
            'last_seen_formatted' => $lastSeen?->format('d/m/Y H:i'),
            'last_seen_relative' => $lastSeen?->diffForHumans(),
            'connection_color' => $connectionColor,
            'minutes_offline' => $minutesOffline,
            'last_seen_relative' => $lastSeen?->diffForHumans(),

            // Contadores
            'paginasImpresas' => $counter?->total_pages ?? 0,
            'paginasBN' => $counter?->bw_pages ?? 0,
            'paginasColor' => $counter?->color_pages ?? 0,
            'cicloMotor'      => $counter?->engine_cycles ?? 0, // Total histórico
            'paginasCopia'    => $counter?->copy_pages ?? 0,
            'paginasScan'     => $counter?->scan_pages ?? 0,
            'paginasFax'      => $counter?->fax_pages ?? 0,


            // Deltas de Impresión
            'impresoHoy'      => $impHoyBN + $impHoyColor,
            'impresoMes'      => $impMesBN + $impMesColor,
            'imp_impreso_hoy_bn'    => $impHoyBN,
            'imp_impreso_hoy_color' => $impHoyColor,
            'imp_impreso_mes_bn'    => $impMesBN,
            'imp_impreso_mes_color' => $impMesColor,

            // DESGASTE MOTOR (Deltas)
            'cicloMotorHoy'   => $impHoyMotor, // Lo que ha girado solo hoy
            'cicloMotorMes'   => $impMesMotor, // Lo que ha girado este mes


            // Suministros usando el Null Coalescing (??)
            'tonerBlack'   => $findSmart(['black', 'toner']) 
                           ?? $findSmart(['black', 'ink'])
                           ?? $findSmart(['black', 'cartridge'], ['drum', 'imaging', 'unit']),

            'tonerCyan'    => $findSmart(['cyan', 'toner']) 
                           ?? $findSmart(['cyan', 'ink'])
                           ?? $findSmart(['cyan', 'cartridge'], ['drum', 'imaging', 'unit']),

            'tonerMagenta' => $findSmart(['magenta', 'toner']) 
                           ?? $findSmart(['magenta', 'ink'])
                           ?? $findSmart(['magenta', 'cartridge'], ['drum', 'imaging', 'unit']),

            'tonerYellow'  => $findSmart(['yellow', 'toner']) 
                           ?? $findSmart(['yellow', 'ink'])
                           ?? $findSmart(['yellow', 'cartridge'], ['drum', 'imaging', 'unit']),

            'drumBlack'    => $findSmart(['black', 'drum']) ?? $findSmart(['black', 'imaging']),
            'drumCyan'     => $findSmart(['cyan', 'drum']) ?? $findSmart(['cyan', 'imaging']),
            'drumMagenta'  => $findSmart(['magenta', 'drum']) ?? $findSmart(['magenta', 'imaging']),
            'drumYellow'   => $findSmart(['yellow', 'drum']) ?? $findSmart(['yellow', 'imaging']),

            'fusor'          => $findSmart(['fuser']) ?? $findSmart(['fus']), 
            'transferRoller' => $findSmart(['transfer']),
            'cajaResiduos'   => $findSmart(['waste']), 
            'adfRoller'      => $findSmart(['adf', 'roller']), 
            'retardPad'      => $findSmart(['retard']) ?? $findSmart(['adf', 'pad']), 
            'mpRoller'       => $findSmart(['mp', 'roller']) 
                             ?? $findSmart(['mp', 'pad']) 
                             ?? $findSmart(['tray', 'roller']),

            'alertas' => $printer->relationLoaded('activeAlerts') ? $printer->activeAlerts->count() : 0,
        ];

        if ($includeDetails) {
            $suppliesArray = $printer->supplies
                ->sortByDesc('read_at')
                ->unique('supply_type')
                ->map(fn($supply) => [
                    'id' => $supply->supply_type,
                    'name' => $supply->name,
                    'type' => $supply->type,
                    'percentage' => (float)$supply->percentage,
                    'status' => $supply->status,
                    'serial_number' => $supply->serial_number, // CRUM
                    'description' => $supply->description
                ])
                ->values()
                ->all();

            $response = array_merge($response, [
                'secondary_serial' => $printer->secondary_serial,
                'custom_location'  => $printer->custom_location,
                'comments'         => $printer->comments,
                'custom_field_1'   => $printer->custom_field_1,
                'custom_field_2'   => $printer->custom_field_2,
                
                'mac' => $printer->mac_address,
                'hostname' => $printer->hostname,
                'firmware' => $printer->firmware_version,
                'asset_tag' => $printer->asset_tag,
                'is_color' => $printer->is_color,
                'is_duplex' => $printer->is_duplex,
                'printer_type' => $printer->printer_type,
                'last_seen_at' => $printer->last_seen_at?->toIso8601String(),
                'last_counter_at' => $printer->last_counter_at?->toIso8601String(),
                'notes' => $printer->notes,
                'sucursal' => $printer->location?->name,
                'alertas_detalle' => $printer->activeAlerts->map(fn($a) => [
                    'code' => $a->code,
                    'severity' => $a->severity,
                    'message' => $a->message,
                    'raised_at' => $a->raised_at?->toIso8601String(),
                ]),
                
                // Array completo de supplies para el modal
                'supplies' => $suppliesArray,
            ]);
        }

        return $response;
    }

    public function updateStatus(Request $request, $code, $serie)
    {
        $request->validate([
            'status' => 'required|in:active,not active'
        ]);

        // Buscamos el tenant por el código que viene en la URL
        $tenant = $this->resolveTenant($code);
        if (!$tenant) return response()->json(['error' => 'Tenant no encontrado'], 404);

        // Entramos a la base de datos de ese cliente específico
        $this->tenantContext->run($tenant, function () use ($serie, $request) {
            $printer = Printer::findOrFail($id);
            $printer->update(['status' => $request->status]);
        });

        return response()->json(['message' => 'Estado actualizado con éxito']);
    }

    public function updateAdminFields(Request $request, $code, $id)
    {
        // Encontrar el tenant por código
        $tenant = Tenant::where('code', $code)->firstOrFail();

        // Inicializar tenancy para acceder a su BD
        Tenancy::initialize($tenant);

        try {
            // Buscar la impresora en la BD del tenant
            $printer = \App\Models\Tenant\Printer::findOrFail($id);

            // Validar datos
            $validated = $request->validate([
                'internal_id'      => 'nullable|string|max:100',
                'secondary_serial' => 'nullable|string|max:100',
                'custom_location'  => 'nullable|string|max:255',
                'comments'         => 'nullable|string',
                'custom_field_1'   => 'nullable|string|max:255',
                'custom_field_2'   => 'nullable|string|max:255',
            ]);

            // Actualizar
            $printer->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Datos de inventario actualizados',
                'data'    => $printer
            ]);

        } finally {
            // Terminar tenancy para volver a la BD central
            Tenancy::end();
        }
    }



    public function globalConnectionStatus(): JsonResponse
    {
        // Vamos directo a la memoria RAM (0.01 segundos)
        // Si por alguna razón el trabajador no ha pasado, devolvemos puros ceros por defecto
        $summary = \Illuminate\Support\Facades\Cache::get('global_printer_status', [
            'active' => 0,
            'warning' => 0,
            'offline' => 0,
            'total' => 0
        ]);

        return response()->json($summary);
    }
}