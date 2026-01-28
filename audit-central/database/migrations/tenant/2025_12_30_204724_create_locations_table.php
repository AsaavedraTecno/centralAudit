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
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('nombre'); // Ej: Casa Matriz
            $table->string('direccion')->nullable();
            $table->string('comuna')->nullable();
            $table->string('region')->nullable();

            // Datos de contacto específicos de la sucursal
            $table->string('nombre_contacto')->nullable(); 
            $table->string('email_contacto')->nullable();
            $table->string('telefono_contacto')->nullable();
            $table->string('telefono_alternativo')->nullable();
            $table->text('comentarios')->nullable();

            $table->boolean('activo')->default(true)->index(); // Por defecto activo
            $table->timestamps();

            // Índices para velocidad de búsqueda
            $table->index(['activo', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
