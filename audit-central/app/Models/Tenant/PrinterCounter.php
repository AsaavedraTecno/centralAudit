<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrinterCounter extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'printer_id',
        'total_pages',
        'bw_pages',
        'color_pages',
        'copy_pages',
        'print_pages',
        'scan_pages',
        'fax_pages',
        'duplex_pages',
        'collected_at',
    ];

    protected $casts = [
        'total_pages' => 'integer',
        'bw_pages' => 'integer',
        'color_pages' => 'integer',
        'collected_at' => 'datetime',
    ];

    /**
     * Impresora a la que pertenece
     */
    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}
