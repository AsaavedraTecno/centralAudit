<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyAggregate extends Model
{
    protected $connection = 'tenant';

    protected $fillable = [
        'printer_id',
        'month',
        'total_pages',
        'bw_pages',
        'color_pages',
        'supplies_avg',
    ];

    protected $casts = [
        'month' => 'date',
        'total_pages' => 'integer',
        'bw_pages' => 'integer',
        'color_pages' => 'integer',
        'supplies_avg' => 'array',
    ];

    public function printer(): BelongsTo
    {
        return $this->belongsTo(Printer::class);
    }
}