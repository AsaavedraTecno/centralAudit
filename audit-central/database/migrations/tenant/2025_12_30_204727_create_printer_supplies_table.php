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
        Schema::create('printer_supplies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')
                ->constrained('printers')
                ->onDelete('cascade');

            // Tipo de suministro: toner_black, toner_cyan, drum_black, fusor, etc.
            // Normalizado para escalar a cualquier tipo de suministro
            $table->string('supply_type')->index();
            
            // Porcentaje o vida útil (0-100%)
            $table->decimal('percentage', 5, 2)->default(0);
            
            // Estado/descripción adicional
            $table->string('status')->default('ok'); // ok|low|critical|empty|error
            
            // Timestamp de lectura para series temporales
            $table->timestamp('read_at')->index();
            $table->timestamps();

            // Índices para queries frecuentes
            $table->unique(['printer_id', 'supply_type', 'read_at']);
            $table->index(['printer_id', 'status']);
            $table->index(['printer_id', 'read_at']);
            $table->index(['supply_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_supplies');
    }
};
