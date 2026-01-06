<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Carbon\Carbon;

class TenantContract extends Model
{
    protected $connection = 'tenant';
    protected $table = 'contracts';

    protected $fillable = [
        'numero_contrato',
        'referencia_externa',
        'fecha_inicio',
        'fecha_fin',
        'fecha_renovacion',
        'estado',
        'monto_anual',
        'moneda',
        'frecuencia_pago',
        'descripcion',
        'terminos_especiales',
        'notas_internas',
        'renovacion_automatica',
        'dias_aviso_vencimiento',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'fecha_renovacion' => 'date',
        'monto_anual' => 'decimal:2',
        'renovacion_automatica' => 'boolean',
    ];

    /**
     * Items del contrato (impresoras incluidas)
     */
    public function items(): HasMany
    {
        return $this->hasMany(TenantContractItem::class, 'contract_id');
    }

    /**
     * Impresoras asociadas a este contrato (through items)
     */
    public function printers(): HasManyThrough
    {
        return $this->hasManyThrough(
            Printer::class,
            TenantContractItem::class,
            'contract_id', // FK en contract_items
            'id',                  // PK en printers
            'id',                  // PK en contracts
            'printer_id'           // FK en contract_items
        );
    }

    /**
     * Impresoras activas en este contrato
     */
    public function activePrinters(): HasManyThrough
    {
        return $this->printers()->where('contract_items.active', true);
    }

    /**
     * Scope para contratos activos
     */
    public function scopeActivos($query)
    {
        return $query->where('estado', 'activo');
    }

    /**
     * Scope para contratos próximos a vencer
     */
    public function scopeProxAVencer($query, int $dias = 30)
    {
        $fecha = now()->addDays($dias);
        return $query->whereBetween('fecha_fin', [now(), $fecha]);
    }

    /**
     * Scope para contratos vencidos
     */
    public function scopeVencidos($query)
    {
        return $query->where('fecha_fin', '<', now());
    }

    /**
     * Scope para contratos en borrador
     */
    public function scopeBorrador($query)
    {
        return $query->where('estado', 'borrador');
    }

    /**
     * ¿El contrato está vigente?
     */
    public function getIsVigenteAttribute(): bool
    {
        return $this->estado === 'activo' && (!$this->fecha_fin || $this->fecha_fin->isFuture());
    }

    /**
     * Días para vencimiento
     */
    public function getDiasParaVencimientoAttribute(): ?int
    {
        if (!$this->fecha_fin) {
            return null;
        }

        return now()->diffInDays($this->fecha_fin, false);
    }

    /**
     * ¿Próximo a vencer?
     */
    public function getIsProxAVencerAttribute(): bool
    {
        $dias = $this->dias_para_vencimiento;
        return $dias !== null && $dias > 0 && $dias <= $this->dias_aviso_vencimiento;
    }

    /**
     * Obtener IDs de impresoras activas
     */
    public function getActivePrinterIds(): array
    {
        return $this->items()
            ->where('active', true)
            ->pluck('printer_id')
            ->toArray();
    }

    /**
     * Contar impresoras en contrato
     */
    public function getPrinterCountAttribute(): int
    {
        return $this->items()->count();
    }

    /**
     * Contar impresoras activas
     */
    public function getActivePrinterCountAttribute(): int
    {
        return $this->items()->where('active', true)->count();
    }
}
