<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ColumnasDisponibles extends Model {
    protected $table = 'columnas_disponibles';
    protected $fillable = ['identificador', 'nombre', 'tipo', 'visible', 'orden', 'ancho', 'componente', 'activa'];
    
    public function scopeActivas($query) {
        return $query->where('activa', true)->orderBy('orden');
    }
}
