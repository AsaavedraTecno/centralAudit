<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Printer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\VistaPersonalizada;
use Illuminate\Support\Facades\DB;


class TenantPrinterController extends Controller
{
    public function index(Request $request, string $code, int $id): JsonResponse
    {
        // 1. Cargar relaciones
        $printers = Printer::where('location_id', $id)
            ->with([
                'latestCounter', 
                'firstCounterToday',
                'firstCounterThisMonth',
                'lastCounterYesterday',
                'supplies' => fn($q) => $q->orderBy('read_at', 'desc'),
                'activeAlerts'
            ])
            ->orderBy('name')
            ->get();

        $formattedPrinters = $printers->map(fn($printer) => $this->formatPrinterResponse($printer));

        return response()->json([
            'success' => true,
            'data' => $formattedPrinters
        ]);
    }

    private function formatPrinterResponse(Printer $printer): array
    {
        $counter = $printer->latestCounter;

        $impHoyBN = 0;
        $impHoyColor = 0;
        $impMesBN = 0;
        $impMesColor = 0;

        if ($counter) {

            // ===== HOY =====

            if ($printer->lastCounterYesterday) {

                $impHoyBN = max(0, $counter->bw_pages - $printer->lastCounterYesterday->bw_pages);
                $impHoyColor = max(0, $counter->color_pages - $printer->lastCounterYesterday->color_pages);

            } elseif ($printer->firstCounterToday) {

                $impHoyBN = max(0, $counter->bw_pages - $printer->firstCounterToday->bw_pages);
                $impHoyColor = max(0, $counter->color_pages - $printer->firstCounterToday->color_pages);

            }

            // ===== MES =====

            if ($printer->firstCounterThisMonth) {

                $impMesBN = max(0, $counter->bw_pages - $printer->firstCounterThisMonth->bw_pages);
                $impMesColor = max(0, $counter->color_pages - $printer->firstCounterThisMonth->color_pages);

            }
        }

        $suppliesMap = $printer->supplies
            ->sortByDesc('read_at')
            ->unique('supply_type')
            ->pluck('percentage', 'supply_type')
            ->toArray();

        $findSmart = function(array $mustHave, array $mustNotHave = []) use ($suppliesMap) {
            foreach ($suppliesMap as $type => $percent) {
                $typeLower = strtolower($type);
                
                // 1. Verificar palabras obligatorias (AND)
                $hasAll = true;
                foreach ($mustHave as $word) {
                    if (!str_contains($typeLower, strtolower($word))) {
                        $hasAll = false;
                        break;
                    }
                }

                // 2. Verificar palabras prohibidas (NOT)
                $hasForbidden = false;
                foreach ($mustNotHave as $word) {
                    if (str_contains($typeLower, strtolower($word))) {
                        $hasForbidden = true;
                        break;
                    }
                }

                // Si cumple todo, devolvemos el valor (y nos aseguramos que sea número)
                if ($hasAll && !$hasForbidden) {
                    return $percent; 
                }
            }
            return null; 
        };

        return [
            'id' => $printer->id,
            'nombre' => $printer->name,
            'modelo' => $printer->model,
            'serie' => $printer->serial_number,
            'ip' => $printer->ip_address,
            'estado' => $printer->status === 'active' ? 1 : 0,
            'ubicacion' => $printer->location, 
            'descripcion' => $printer->description,

            // Contadores
            'paginasImpresas' => $counter?->total_pages ?? 0,
            'paginasBN' => $counter?->bw_pages ?? 0,
            'paginasColor' => $counter?->color_pages ?? 0,
            'impresoHoy' => $impHoyBN + $impHoyColor,
            'impresoMes' => $impMesBN + $impMesColor,
            'imp_impreso_hoy_bn' => $impHoyBN,
            'imp_impreso_hoy_color' => $impHoyColor,

            'imp_impreso_mes_bn' => $impMesBN,
            'imp_impreso_mes_color' => $impMesColor,

            // "black_toner_cartridge" -> Busca 'black' y 'toner'
            // "black_ink_hp_cn625a" -> Busca 'black' y 'ink'
            // "black_cartridge" -> Busca 'black' y 'cartridge' (evitando drum/imaging)
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

            // "black_imaging_unit" -> Busca 'black' e 'imaging'
            // "black_drum_cartridge" -> Busca 'black' y 'drum'
            'drumBlack'    => $findSmart(['black', 'drum']) ?: $findSmart(['black', 'imaging']),
            'drumCyan'     => $findSmart(['cyan', 'drum']) ?: $findSmart(['cyan', 'imaging']),
            'drumMagenta'  => $findSmart(['magenta', 'drum']) ?: $findSmart(['magenta', 'imaging']),
            'drumYellow'   => $findSmart(['yellow', 'drum']) ?: $findSmart(['yellow', 'imaging']),

            // "fuser" -> Busca 'fus'
            'fusor'          => $findSmart(['fuser']) ?? $findSmart(['fus']),
            
            // "transfer_roller" -> Busca 'transfer'
            'transferRoller' => $findSmart(['transfer']),
            
            // "waste_toner", "waste_box"
            'cajaResiduos'   => $findSmart(['waste']), 
            
            // "adf_roller", "adf_retard_pad"
            'adfRoller'      => $findSmart(['adf', 'roller']), // Específico para rodillo
            'retardPad'      => $findSmart(['retard']) ?? $findSmart(['adf', 'pad']),
            
            // "tray_2_roller", "mp_holder_pad"
            'mpRoller'       => $findSmart(['mp', 'roller']) 
                             ?? $findSmart(['mp', 'pad']) 
                             ?? $findSmart(['tray', 'roller']),

            'alertas' => $printer->relationLoaded('activeAlerts') ? $printer->activeAlerts->count() : 0,

            // DEBUG: Para ver qué nombres siguen sin mapear
            'debug_raw_keys' => array_keys($suppliesMap)
        ];
    }



    public function vistaPanel()
    {
        $tenantId = tenant()->id;

        $vista = VistaPersonalizada::join(
            'vista_tenants',
            'vistas_personalizadas.id',
            '=',
            'vista_tenants.vista_id'
        )
        ->where('vista_tenants.tenant_id', $tenantId)
        ->select('vistas_personalizadas.*')
        ->first();

        if(!$vista){
            $vista = VistaPersonalizada::where('es_default', true)->first();
        }

        return response()->json([
            'vista' => $vista
        ]);
    }


}