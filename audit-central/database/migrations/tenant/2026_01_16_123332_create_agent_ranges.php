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
        Schema::create('agent_ranges', function (Blueprint $table) {
            $table->id();
    
            // Relación con el agente que hará el trabajo
            $table->foreignId('agent_id')->constrained('agent_status')->onDelete('cascade');
            
            // Los campos que pediste (Todos como String)
            $table->string('ip_from');        // Digitalizar desde (ej: 192.168.0.1)
            $table->string('ip_to');          // Digitalizar a (ej: 192.168.0.254)
            $table->string('subnet_mask');    // Máscara de subred (ej: 255.255.255.0)
            
            $table->integer('ips_to_scan')->default(0); // Opcional: Para saber cuántas IPs hay en total
            $table->boolean('active')->default(true);   // Por si quieres desactivar un rango sin borrarlo
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_ranges');
    }
};
