<?php

namespace App\Models\Tenant;
    
use Illuminate\Database\Eloquent\Model;

class AgentScanRange extends Model
{
    protected $table = 'agent_ranges'; // Nombre exacto 
    protected $fillable = [
        'agent_id', 
        'ip_from', 
        'ip_to', 
        'subnet_mask', 
        'active',
        'ips_to_scan'
    ];

    public function agent()
    {
        return $this->belongsTo(Agent::class);
    }
}
