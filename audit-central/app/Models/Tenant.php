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
     * - name: Nombre de la empresa (informativo)
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
            'name',
            'db_name',
            'db_host',
            'db_user',
            'db_password',
            'status',
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
            // Generar UUID PRIMERO si no existe
            if (!$tenant->id) {
                $tenant->id = \Illuminate\Support\Str::uuid();
            }
            
            // Generar code (slug) del nombre si no está set
            if (!$tenant->code && $tenant->name) {
                $tenant->code = \Illuminate\Support\Str::slug($tenant->name, '');
            }
            
            // Asignar db_name con el patrón: audit_central_t{8-chars}
            // Ahora id ya existe
            if (!$tenant->db_name) {
                $shortId = substr($tenant->id, 0, 8);
                $tenant->db_name = 'audit_central_t' . $shortId;
            }
            
            // Usar las credenciales del .env para todas las BDs de tenant
            if (!$tenant->db_host) {
                $tenant->db_host = env('DB_HOST', 'localhost');
            }
            if (!$tenant->db_user) {
                $tenant->db_user = env('DB_USERNAME', 'postgres');
            }
            if (!$tenant->db_password) {
                $tenant->db_password = encrypt(env('DB_PASSWORD', ''));
            }
            
            // Status por defecto
            if (!$tenant->status) {
                $tenant->status = 'active';
            }
        });

        // Crear dominio automáticamente después de guardar
        static::created(function (Tenant $tenant) {
            // Generar dominio primario: {code}-{random}.app.cl
            $randomString = \Illuminate\Support\Str::random(8);
            $domainString = strtolower($tenant->code) . '-' . $randomString . '.app.cl';
            
            Domain::create([
                'tenant_id' => $tenant->id,
                'domain' => $domainString,
                'type' => 'primary',
                'status' => 'active',
            ]);
        });
    }
}


