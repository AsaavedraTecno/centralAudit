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
        Schema::create('printer_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained('printers')->cascadeOnDelete();
            $table->string('event_code')->comment('e.g. STATUS_CHANGED, TONER_LOW, ERROR');
            $table->string('event_type');              // e.g. status|error|supply_low|maintenance
            $table->string('severity')->default('info'); // info|warn|critical
            
            // Para eventos relacionados a suministros
            $table->string('supply_type')->nullable()->comment('supply_type si aplica (toner_black, fusor, etc)');
            
            // Detalles
            $table->text('message')->nullable();
            $table->json('data')->nullable()->comment('Datos adicionales en JSON');
            
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();

            // Índices para queries frecuentes
            $table->index(['printer_id', 'occurred_at']);
            $table->index(['event_type', 'severity']);
            $table->index(['printer_id', 'event_code']);
            $table->index(['supply_type', 'occurred_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_events');
    }
};
