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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();

            // Identificación del contrato
            $table->string('numero_contrato')->nullable()->unique()
                ->comment('Número de contrato interno');
            $table->string('referencia_externa')->nullable()
                ->comment('Referencia del cliente (PO, orden, etc)');

            // Fechas
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable()
                ->comment('null = indefinido');
            $table->date('fecha_renovacion')->nullable();

            // Estado del contrato
            $table->enum('estado', [
                'borrador',       // Aún no activado
                'activo',         // Contrato vigente
                'proximo_vencer', // Vence dentro de 30 días
                'vencido',        // Expiró
                'renovado',       // Renovado (anterior vencido)
                'suspendido',     // Suspendido
                'terminado'       // Terminado anticipadamente
            ])->default('borrador')->index();

            // Términos comerciales
            $table->decimal('monto_anual', 10, 2)->nullable()
                ->comment('Monto del contrato en CLP');
            $table->enum('moneda', ['CLP', 'USD', 'EUR'])->default('CLP');
            $table->enum('frecuencia_pago', ['unico', 'mensual', 'trimestral', 'semestral', 'anual'])
                ->default('anual');

            // Descripción y notas
            $table->text('descripcion')->nullable();
            $table->text('terminos_especiales')->nullable()
                ->comment('Condiciones especiales acordadas');
            $table->text('notas_internas')->nullable()
                ->comment('Notas solo para el equipo');

            // Renovación automática
            $table->boolean('renovacion_automatica')->default(true);
            $table->integer('dias_aviso_vencimiento')->default(30)
                ->comment('Días antes del vencimiento para avisar');

            // Auditoría
            $table->timestamps();
            $table->softDeletes();

            // Índices para queries frecuentes
            $table->index(['estado', 'fecha_fin']);
            $table->index('fecha_renovacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contracts');
    }
};
