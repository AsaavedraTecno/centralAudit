<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserTenantAssignment extends Model
{
    protected $table = 'user_tenant_assignment';
    protected $fillable = ['user_id', 'tenant_id', 'scope'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
