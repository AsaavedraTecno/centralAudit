<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class DailyAggregate extends Model
{
    protected $guarded = ['id'];
    public $timestamps = true;

    // Casting para que supplies_avg se maneje como array automáticamente
    protected $casts = [
        'date' => 'date',
        'supplies_avg' => 'array',
    ];

    public function printer()
    {
        return $this->belongsTo(Printer::class);
    }
}