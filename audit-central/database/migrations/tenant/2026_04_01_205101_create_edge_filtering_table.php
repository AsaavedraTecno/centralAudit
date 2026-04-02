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
        Schema::create('edge_filtering', function (Blueprint $table) {
            $table->id();
            
            // Relacionado al agente para que la lista negra sea específica por red
            $table->foreignId('agent_id')->constrained('agent_status')->cascadeOnDelete();
            
            // La MAC es la clave principal para ignorar dispositivos en la red
            $table->string('mac_address', 17);
            
            // Datos informativos (para que sepas por qué la ignoraste)
            $table->string('ip_address', 45)->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->text('reason')->nullable(); // Ej: "Impresora personal de gerencia"
            
            // Quién y cuándo la ignoró
            $table->foreignId('ignored_by_user_id')->nullable(); // ID del admin que le dio clic a "Ignorar"
            $table->timestamps();

            // Un agente no puede tener la misma MAC dos veces en su lista negra
            $table->unique(['agent_id', 'mac_address'], 'ignored_devices_agent_mac_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('edge_filtering');
    }
};
