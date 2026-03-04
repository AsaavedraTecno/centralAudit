<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vistas_personalizadas', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            
            // Datos básicos de la vista
            $table->string('nombre', 100);
            $table->text('descripcion')->nullable();
            
            // Configuración de columnas (JSON)
            // Formato: [
            //   {
            //     "identificador": "imp_nombre",
            //     "nombre": "Nombre Impresora",
            //     "visible": true,
            //     "orden": 1,
            //     "ancho": 280,
            //     "tipo": "impresora",
            //     "componente": "texto"
            //   },
            //   ...
            // ]
            $table->json('columnas');
            
            
            // Flag para marcar si es la vista por defecto del usuario
            $table->boolean('es_default')->default(false);
            
            // Timestamps
            $table->timestamps();
            
            // Índices para búsquedas rápidas
            $table->index('user_id');
            $table->index('nombre');
            
            // Constraint: no puede haber dos vistas con el mismo nombre para el mismo usuario
            $table->unique(['user_id', 'nombre']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vistas_personalizadas');
    }
};