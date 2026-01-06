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
        Schema::create('company_info', function (Blueprint $table) {
            $table->id();

            // Información legal
            $table->string('rut')->nullable()->unique()->comment('RUT sin formato (único por tenant)');
            $table->string('razon_social')->nullable();

            // Ubicación
            $table->string('direccion')->nullable();
            $table->string('numero')->nullable();
            $table->string('depto')->nullable();
            $table->string('comuna')->nullable();
            $table->string('ciudad')->nullable();
            $table->string('region')->nullable();
            $table->string('codigo_postal')->nullable();
            $table->string('pais')->default('CL');

            // Datos comerciales
            $table->string('giro')->nullable()->comment('Rubro de negocio');
            $table->string('website')->nullable();
            $table->string('logo_url')->nullable();

            // Auditoría
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('rut');
            $table->index(['ciudad', 'region']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_info');
    }
};
