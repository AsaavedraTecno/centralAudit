<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class MonthlyAggregate extends Model
{
    protected $guarded = ['id'];
    public $timestamps = true;

    protected $casts = [
        'month' => 'date',
        'supplies_avg' => 'array',
    ];

    public function printer()
    {
        return $this->belongsTo(Printer::class);
    }
}