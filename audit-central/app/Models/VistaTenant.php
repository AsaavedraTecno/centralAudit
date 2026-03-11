<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VistaTenant extends Model
{
    protected $table = 'vista_tenants';
    protected $connection = 'central';

    protected $fillable = [
        'vista_id',
        'tenant_id'
    ];
}