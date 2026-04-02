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
        Schema::create('discovered_printers', function (Blueprint $table) {
            $table->id();
            
            // Relacionamos el descubrimiento con el agente que lo encontró y su ubicación
            $table->foreignId('agent_id')->constrained('agent_status')->cascadeOnDelete();
            $table->foreignId('location_id')->constrained('locations')->cascadeOnDelete();

            // Datos de red básicos (Lo mínimo que el agente siempre va a encontrar)
            $table->string('ip_address', 45);
            $table->string('mac_address', 17)->nullable()->index();
            $table->string('hostname')->nullable();

            // Datos de identificación (Lo que el agente intentó leer por SNMP)
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable(); 
            
            // El JSON completo con toda la basura/info extra que mandó el agente
            $table->json('raw_snmp_data')->nullable(); 

            // Control de estado de la bandeja de entrada
            // 'pending' -> Recién descubierta, esperando tu decisión
            // 'approved' -> Ya la pasaste a la tabla oficial de 'printers'
            // 'ignored' -> La mandaste a la lista negra
            $table->enum('status', ['pending', 'approved', 'ignored'])->default('pending')->index();

            // Fechas de descubrimiento
            $table->timestamp('first_seen_at')->useCurrent();
            $table->timestamp('last_seen_at')->useCurrent();
            $table->timestamps();

            // Evitar duplicados en la bandeja de entrada por agente y MAC
            // Si la MAC es nula, permitimos múltiples registros (algunas impresoras viejas no dan MAC)
            $table->unique(['agent_id', 'mac_address'], 'discovered_printers_agent_mac_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discovered_printers');
    }
};
