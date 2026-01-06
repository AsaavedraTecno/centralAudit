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
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();

            // Tipo de contacto
            $table->enum('tipo', [
                'principal',      // Contacto principal de la empresa
                'ti',             // Responsable técnico/IT
                'facturacion',    // Contacto de facturación
                'soporte',        // Contacto de soporte
                'otro'            // Otros
            ])->index();

            // Información del contacto
            $table->string('nombre');
            $table->string('email')->nullable();
            $table->string('telefono')->nullable();
            $table->string('telefono_alternativo')->nullable();

            // Cargo/rol
            $table->string('cargo')->nullable();
            $table->string('departamento')->nullable();

            // Disponibilidad
            $table->boolean('es_principal')->default(false)
                ->comment('¿Es el contacto principal para este tipo?');
            $table->boolean('activo')->default(true)->index();

            // Preferencia de contacto
            $table->enum('preferencia_contacto', ['email', 'telefono', 'whatsapp', 'ambos'])
                ->default('email');

            // Auditoría
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tipo', 'activo']);
            $table->index('es_principal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
