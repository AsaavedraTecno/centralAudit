<?php

namespace App\Http\Controllers;

use App\Models\Tenant\Printer;
use App\Models\Tenant\Location;
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrinterController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Lista impresoras de una sucursal con supplies y contadores
     * GET /api/clients/{code}/sucursales/{locationId}/impresoras
     */
    public function index(Request $request, string $code, int $locationId): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $printers = $this->tenantContext->run($tenant, function () use ($locationId) {
            $location = Location::find($locationId);

            if (!$location) {
                return null;
            }

            return Printer::where('location_id', $locationId)
                ->with(['latestCounter', 'latestSupply', 'activeAlerts'])
                ->orderBy('name')
                ->get()
                ->map(fn($printer) => $this->formatPrinterResponse($printer));
        });

        if ($printers === null) {
            return response()->json(['error' => 'Sucursal no encontrada'], 404);
        }

        return response()->json([
            'impresoras' => $printers,
        ]);
    }

    /**
     * Detalle de una impresora
     * GET /api/clients/{code}/sucursales/{locationId}/impresoras/{id}
     */
    public function show(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $printer = $this->tenantContext->run($tenant, function () use ($locationId, $id) {
            return Printer::where('location_id', $locationId)
                ->where('id', $id)
                ->with(['latestCounter', 'latestSupply', 'activeAlerts', 'locationRelation'])
                ->first();
        });

        if (!$printer) {
            return response()->json(['error' => 'Impresora no encontrada'], 404);
        }

        return response()->json([
            'impresora' => $this->formatPrinterResponse($printer, true),
        ]);
    }

    /**
     * Historial de contadores de una impresora
     * GET /api/clients/{code}/sucursales/{locationId}/impresoras/{id}/counters
     */
    public function counters(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $days = $request->input('days', 30);

        $counters = $this->tenantContext->run($tenant, function () use ($id, $days) {
            $printer = Printer::find($id);

            if (!$printer) {
                return null;
            }

            return $printer->counters()
                ->where('collected_at', '>=', now()->subDays($days))
                ->orderBy('collected_at', 'desc')
                ->get();
        });

        if ($counters === null) {
            return response()->json(['error' => 'Impresora no encontrada'], 404);
        }

        return response()->json([
            'counters' => $counters,
        ]);
    }

    /**
     * Historial de supplies de una impresora
     * GET /api/clients/{code}/sucursales/{locationId}/impresoras/{id}/supplies
     */
    public function supplies(Request $request, string $code, int $locationId, int $id): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());

        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado o sin acceso'], 403);
        }

        $days = $request->input('days', 30);

        $supplies = $this->tenantContext->run($tenant, function () use ($id, $days) {
            $printer = Printer::find($id);

            if (!$printer) {
                return null;
            }

            return $printer->supplies()
                ->where('read_at', '>=', now()->subDays($days))
                ->orderBy('read_at', 'desc')
                ->get();
        });

        if ($supplies === null) {
            return response()->json(['error' => 'Impresora no encontrada'], 404);
        }

        return response()->json([
            'supplies' => $supplies,
        ]);
    }

    /**
     * Formatea la respuesta de impresora para el frontend
     */
    private function formatPrinterResponse(Printer $printer, bool $includeDetails = false): array
    {
        $counter = $printer->latestCounter;
        $supply = $printer->latestSupply;

        $response = [
            // Identificación
            'id' => $printer->id,
            'nombre' => $printer->name,
            'descripcion' => $printer->description,
            'ip' => $printer->ip_address,
            'modelo' => $printer->model,
            'serie' => $printer->serial_number,
            'marca' => $printer->brand,
            'estado' => $printer->status === 'active' ? 1 : 0,
            'ubicacion' => $printer->location,

            // Contadores
            'paginasImpresas' => $counter?->total_pages ?? 0,
            'paginasBN' => $counter?->bw_pages ?? 0,
            'paginasColor' => $counter?->color_pages ?? 0,

            // Toners
            'tonerBlack' => $supply?->toner_black,
            'tonerCyan' => $supply?->toner_cyan,
            'tonerMagenta' => $supply?->toner_magenta,
            'tonerYellow' => $supply?->toner_yellow,

            // Drums
            'drumBlack' => $supply?->drum_black,
            'drumCyan' => $supply?->drum_cyan,
            'drumMagenta' => $supply?->drum_magenta,
            'drumYellow' => $supply?->drum_yellow,

            // Reveladores
            'reveladorBlack' => $supply?->revelador_black,
            'reveladorMagenta' => $supply?->revelador_magenta,
            'reveladorYellow' => $supply?->revelador_yellow,

            // Otros consumibles
            'fusor' => $supply?->fusor,
            'adfRoller' => $supply?->adf_roller,
            'transferRoller' => $supply?->transfer_roller,
            'mpRoller' => $supply?->mp_roller,
            'retardPad' => $supply?->retard_pad,
            'cajaResiduos' => $supply?->waste_box,

            // Alertas activas
            'alertas' => $printer->activeAlerts->count(),
        ];

        if ($includeDetails) {
            $response = array_merge($response, [
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
                'sucursal' => $printer->locationRelation?->name,
                'alertas_detalle' => $printer->activeAlerts->map(fn($a) => [
                    'code' => $a->code,
                    'severity' => $a->severity,
                    'message' => $a->message,
                    'raised_at' => $a->raised_at?->toIso8601String(),
                ]),
            ]);
        }

        return $response;
    }
}
