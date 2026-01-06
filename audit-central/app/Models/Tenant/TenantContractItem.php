<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantContractItem extends Model
{
    protected $connection = 'tenant';
    protected $table = 'contract_items';

    protected $fillable = [
        'contract_id',
        'printer_id',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Contrato al que pertenece este item
     */
    public function contract(): BelongsTo
    {
        return $this->belongsTo(TenantContract::class, 'contract_id');
    }

    /**
     * Impresora de este item
     */
    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }

    /**
     * Scope: items activos
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Scope: items para un contrato específico
     */
    public function scopeForContract($query, int $contractId)
    {
        return $query->where('contract_id', $contractId);
    }

    /**
     * Scope: items de una impresora
     */
    public function scopeForPrinter($query, int $printerId)
    {
        return $query->where('printer_id', $printerId);
    }
}
