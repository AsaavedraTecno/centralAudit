<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'printer_id',
        'code',
        'severity',
        'message',
        'raised_at',
        'cleared_at',
    ];

    protected $casts = [
        'raised_at' => 'datetime',
        'cleared_at' => 'datetime',
    ];

    // Severidades
    const SEVERITY_INFO = 'info';
    const SEVERITY_WARN = 'warn';
    const SEVERITY_ERROR = 'error';

    // Códigos comunes
    const CODE_LOW_TONER_BLACK = 'LOW_TONER_BLACK';
    const CODE_LOW_TONER_CYAN = 'LOW_TONER_CYAN';
    const CODE_LOW_TONER_MAGENTA = 'LOW_TONER_MAGENTA';
    const CODE_LOW_TONER_YELLOW = 'LOW_TONER_YELLOW';
    const CODE_LOW_DRUM = 'LOW_DRUM';
    const CODE_LOW_FUSER = 'LOW_FUSER';
    const CODE_WASTE_BOX_FULL = 'WASTE_BOX_FULL';
    const CODE_OFFLINE = 'OFFLINE';
    const CODE_PAPER_JAM = 'PAPER_JAM';

    /**
     * Impresora relacionada
     */
    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }

    /**
     * Scope para alertas activas (no resueltas)
     */
    public function scopeActive($query)
    {
        return $query->whereNull('cleared_at');
    }

    /**
     * Scope por severidad
     */
    public function scopeBySeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Marcar como resuelta
     */
    public function resolve(): void
    {
        $this->update(['cleared_at' => now()]);
    }

    /**
     * Verificar si está resuelta
     */
    public function isResolved(): bool
    {
        return $this->cleared_at !== null;
    }
}
