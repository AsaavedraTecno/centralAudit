<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrinterSupply extends Model
{
    protected $connection = 'tenant';
    protected $table = 'printer_supplies';

    protected $fillable = [
        'printer_id',
        'supply_type',
        'percentage',
        'status',
        'read_at',
    ];

    protected $casts = [
        'percentage' => 'decimal:2',
        'read_at' => 'datetime',
    ];

    /**
     * Impresora a la que pertenece
     */
    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }

    /**
     * Scope: Suministros activos (último registro por supply_type)
     */
    public function scopeLatest($query)
    {
        return $query->whereIn('id', function ($subquery) {
            $subquery->selectRaw('MAX(id)')
                ->from('printer_supplies')
                ->groupBy('printer_id', 'supply_type');
        });
    }

    /**
     * Scope: Suministros con nivel bajo
     */
    public function scopeLow($query, int $threshold = 15)
    {
        return $query->where('percentage', '<', $threshold)
            ->where('status', '!=', 'empty');
    }

    /**
     * Scope: Suministros críticos
     */
    public function scopeCritical($query, int $threshold = 5)
    {
        return $query->where('percentage', '<', $threshold);
    }

    /**
     * Scope: Por tipo de suministro
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('supply_type', $type);
    }

    /**
     * Scope: Por impresora
     */
    public function scopeForPrinter($query, int $printerId)
    {
        return $query->where('printer_id', $printerId);
    }

    /**
     * Obtener label legible del tipo de suministro
     */
    public function getSupplyTypeLabel(): string
    {
        $labels = [
            'toner_black' => 'Tóner Negro',
            'toner_cyan' => 'Tóner Cyan',
            'toner_magenta' => 'Tóner Magenta',
            'toner_yellow' => 'Tóner Amarillo',
            'drum_black' => 'Drum Negro',
            'drum_cyan' => 'Drum Cyan',
            'drum_magenta' => 'Drum Magenta',
            'drum_yellow' => 'Drum Amarillo',
            'fusor' => 'Fusor',
            'transfer_roller' => 'Rodillo de Transferencia',
            'adf_roller' => 'Rodillo ADF',
            'mp_roller' => 'Rodillo Bandeja Múltiple',
            'retard_pad' => 'Almohadilla Retractora',
            'waste_box' => 'Caja de Desechos',
        ];
        
        return $labels[$this->supply_type] ?? ucfirst(str_replace('_', ' ', $this->supply_type));
    }

    /**
     * Obtener icono/color por estado
     */
    public function getStatusColor(): string
    {
        return match($this->status) {
            'ok' => 'green',
            'low' => 'yellow',
            'critical' => 'red',
            'empty' => 'black',
            'error' => 'purple',
            default => 'gray'
        };
    }
}
