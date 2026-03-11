<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VistaPersonalizada extends Model
{
    use HasFactory;

    protected $table = 'vistas_personalizadas';
    protected $connection = 'central';

    /**
     * Los atributos que pueden ser asignados masivamente
     */
    protected $fillable = [
        'user_id',
        'nombre',
        'descripcion',
        'columnas',
        'es_default',
    ];

    /**
     * Los atributos que deben ser casteados a tipos nativos
     */
    protected $casts = [
        'columnas' => 'array',  // Automáticamente convierte JSON a array y viceversa
        'es_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: Una vista pertenece a un usuario
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope: Obtener vistas de un usuario específico
     */
    public function scopeDelUsuario($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: Obtener la vista por defecto de un usuario
     */
    public function scopeDefault($query, $userId)
    {
        return $query->where('user_id', $userId)
                    ->where('es_default', true);
    }

    /**
     * Scope: Obtener vistas ordenadas por nombre
     */
    public function scopeOrdenadas($query)
    {
        return $query->orderBy('nombre', 'asc');
    }

    /**
     * Event: Antes de guardar una nueva vista, asegurar que no haya otra por defecto
     * (Si es la nueva vista por defecto, quitar esa marca de las demás)
     */
    protected static function booted()
    {
        static::saving(function ($vista) {
            // Si esta vista se marca como default, quitar esa marca de las otras
            if ($vista->es_default && $vista->isDirty('es_default')) {
                static::where('user_id', $vista->user_id)
                    ->where('id', '!=', $vista->id)
                    ->update(['es_default' => false]);
            }
        });
    }

    public function tenants()
    {
        return $this->belongsToMany(
            Tenant::class,
            'vista_tenants',
            'vista_id',
            'tenant_id'
        );
    }
}