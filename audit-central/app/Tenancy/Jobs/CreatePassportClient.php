<?php

namespace App\Tenancy\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Stancl\Tenancy\Contracts\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreatePassportClient implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected Tenant $tenant) {}

    public function handle(): void
    {
        // Usamos el contexto del tenant
        $this->tenant->run(function () {
            
            $clientId = Str::uuid()->toString();

            // Insertamos los datos EXACTOS que pide tu migración
            DB::table('oauth_clients')->insert([
                'id'                     => $clientId,
                'user_id'                => null,
                'name'                   => $this->tenant->nombre . ' Auth Client',
                'secret'                 => Str::random(40),
                'provider'               => 'tenant_users',
                'redirect_uris' => json_encode(['http://localhost']), 
                'personal_access_client' => true,               
                'password_client'        => false,
                'revoked'                => false,
                'created_at'             => now(),
                'updated_at'             => now(),
            ]);

            // Vinculamos el cliente personal
            DB::table('oauth_personal_access_clients')->insert([
                'client_id'  => $clientId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });
    }
}