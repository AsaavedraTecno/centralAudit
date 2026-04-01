<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use App\Models\Tenant;
use App\Services\TenantContextService;
use App\Models\Tenant\Printer;

class UpdateGlobalStatus extends Command
{
    protected $signature = 'dashboard:update-global-status';
    protected $description = 'Actualiza el estado global de las impresoras de todos los tenants';

    public function handle(TenantContextService $tenantContext)
    {
        $this->info('Iniciando recuento global de impresoras...');

        $summary = [
            'active' => 0,
            'warning' => 0,
            'offline' => 0,
            'total' => 0
        ];

        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            $tenantContext->run($tenant, function () use (&$summary) {
                $now = now()->utc();
                
                // Solo traemos lo que necesitamos
                $printers = Printer::select('id', 'last_seen_at', 'status')->get();

                foreach ($printers as $printer) {
                    $summary['total']++;
                    
                    if (!$printer->last_seen_at) {
                        $summary['offline']++;
                        continue;
                    }

                    $minutes = abs($now->diffInMinutes($printer->last_seen_at->utc()));

                    if ($minutes > 30 || $printer->status !== 'active') {
                        $summary['offline']++;
                    } elseif ($minutes > 10) {
                        $summary['warning']++;
                    } else {
                        $summary['active']++;
                    }
                }
            });
        }

        // Guardamos el resultado en la memoria RAM del servidor (Caché) por 6 minutos
        Cache::put('global_printer_status', $summary, now()->addMinutes(6));

        $this->info('¡Recuento finalizado con éxito! Total: ' . $summary['total']);
    }
}
