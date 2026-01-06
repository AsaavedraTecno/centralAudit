<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Mapeo de impresoras incluidas en cada contrato
     * Permite que un contrato incluya ALGUNAS impresoras, no todas
     */
    public function up(): void
    {
        Schema::create('contract_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')
                ->constrained('contracts')
                ->cascadeOnDelete();
            $table->foreignId('printer_id')
                ->constrained('printers')
                ->cascadeOnDelete();

            // Estado: activa/inactiva en este contrato
            $table->boolean('active')->default(true)->index();

            // Auditoría
            $table->timestamps();

            // Índices
            $table->unique(['contract_id', 'printer_id']);
            $table->index(['contract_id', 'active']);
            $table->index(['printer_id', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_items');
    }
};
