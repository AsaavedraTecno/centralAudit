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
        Schema::create('columnas_disponibles', function (Blueprint $table) {
            $table->id();
            $table->string('identificador', 100)->unique();
            $table->string('nombre', 150);
            $table->enum('tipo', ['cliente', 'sucursal', 'impresora']);
            $table->string('categoria', 50)->default('general');
            $table->boolean('visible')->default(true);
            $table->integer('orden');
            $table->integer('ancho');
            $table->string('componente', 50)->nullable();
            $table->boolean('activa')->default(true); // ← Para desactivar sin borrar
            $table->timestamps();
            $table->index('activa');
            $table->index('tipo');
            $table->index('categoria');         
            $table->index(['tipo','categoria']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('columnas_disponibles');
    }
};
