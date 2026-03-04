<?php

namespace App\Models;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    /**
     * Ocultar del JSON
     */
    protected $hidden = ['data'];

    /**
     * Columnas que se guardan directamente en la tabla (no en JSON data)
     * 
     * Solo guardar datos de administración del tenant, NO datos de negocio.
     * - id: Identificador único del tenant
     * - rut: RUT de la empresa (informativo)
     * - code: Código único del tenant (slug del nombre)
     * - nombre: Nombre de la empresa (informativo)
     * - db_name: Nombre de la base de datos del tenant
     * - db_host: Host donde corre la BD del tenant
     * - db_user: Usuario para acceder a la BD del tenant
     * - db_password: Password encriptado del usuario
     * - status: Estado del tenant (active|suspended|maintenance)
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'code',
            'nombre',
            'rut',
            'direccion',
            'region',                
            'comuna',      
            'device_limit',           
            'timezone',               
            'logo_url',               
            'db_name',  
            'status',

            'db_name',
            'db_host',
            'db_user',
            'db_password',
        ];
    }

    /**
     * Dominios asociados a este tenant
     */
    public function domains()
    {
        return $this->hasMany(Domain::class);
    }

    /**
     * Dominio principal (primario)
     */
    public function primaryDomain()
    {
        return $this->hasOne(Domain::class)->where('type', 'primary');
    }

    /**
     * Override de getDatabaseName() para retornar patrón: prefix + 8-chars-uuid + suffix
     * Stancl llama a este método cuando crea/accede a la BD
     * @return string
     */
    public function getDatabaseName(): string
    {
        // Si tenemos un id, usar solo los primeros 8 caracteres
        if ($this->id) {
            $prefix = config('tenancy.database.prefix', '');
            $suffix = config('tenancy.database.suffix', '');
            $shortId = substr((string)$this->id, 0, 8);
            return $prefix . $shortId . $suffix;
        }
        
        // Fallback: retornar db_name si está set
        if ($this->db_name) {
            return $this->db_name;
        }
        
        // Last resort: vacio
        return '';
    }

    /**
     * Boot: crear db_name y dominio automáticamente
     * 
     * Flujo atómico:
     * 1. Generar db_name automáticamente (audit-central-{tenant_id})
     * 2. Configurar conexión a BD (host, user, password desde .env)
     * 3. Al guardar: crear domain automáticamente
     * 4. Eventos de Stancl ejecutarán: CreateDatabase → MigrateDatabase → SeedDatabase
     */
    public static function boot()
    {
        parent::boot();

        // Generar code, db_name y credenciales automáticamente al crear
        static::creating(function (Tenant $tenant) {
            if (!$tenant->id) {
                $tenant->id = (string) \Illuminate\Support\Str::uuid();
            }
            
            if (!$tenant->code && $tenant->nombre) {
                $tenant->code = \Illuminate\Support\Str::slug($tenant->nombre);
            }

            // Simplificamos la generación del db_name
            if (!$tenant->db_name) {
                $tenant->db_name = 'audit_central_t' . substr($tenant->id, 0, 8);
            }

            // Credenciales automáticas
            $tenant->db_host = $tenant->db_host ?? env('DB_HOST', 'localhost');
            $tenant->db_user = $tenant->db_user ?? env('DB_USERNAME', 'postgres');
            $tenant->db_password = $tenant->db_password ?? encrypt(env('DB_PASSWORD', ''));
            $tenant->status = $tenant->status ?? 'active';
        });

        // Crear dominio automáticamente después de guardar
        static::created(function (Tenant $tenant) {
            // Formato: usach-centralaudit.tecnodatasa.cl
            $domainName = $tenant->code . '.centralaudit.tecnodatasa.cl';

            $tenant->domains()->create([
                'domain' => $domainName,
                'type' => 'primary',
                'status' => 'active',
            ]);
        });
    }

    /**
     * Relación: Un Tenant tiene muchos contactos
     */
    public function contacts()
    {
        return $this->hasMany(TenantContact::class, 'tenant_id', 'id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_tenant_assignment', 'tenant_id', 'user_id')
                    ->withPivot('scope')
                    ->withTimestamps();
    }

    public function agentKeys()
    {
        return $this->hasMany(AgentKey::class);
    }
}


