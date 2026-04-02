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
        Schema::create('printers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('description')->nullable();

            $table->string('internal_id')->nullable()->index(); // ID tipo WH-128
            $table->string('secondary_serial')->nullable();     // Serie 2
            $table->string('custom_location')->nullable();      // Ubicación manual (no SNMP)

            $table->foreignId('agent_id')->constrained('agent_status')->onDelete('cascade');

            // Sucursal/ubicación del cliente
            $table->foreignId('location_id')->constrained('locations')->cascadeOnDelete();

            // Atributos del dispositivo
            $table->string('model')->nullable();
            $table->string('brand')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('status')->default('active');
            $table->string('ip_address', 45)->nullable(); // IPv4/IPv6
            $table->string('location')->nullable(); // texto libre de ubicación física

            // Identificación de red
            $table->string('mac_address', 17)->nullable();
            $table->string('hostname')->nullable();
            $table->string('firmware_version')->nullable();

            // Inventario
            $table->string('asset_tag')->nullable()->index();

            // Capacidades
            $table->boolean('is_color')->default(false);
            $table->boolean('is_duplex')->default(false);
            $table->boolean('is_networked')->default(true);
            $table->enum('printer_type', ['laser', 'inkjet', 'thermal', 'mfp', 'plotter', 'other'])->default('laser');

            // Monitoreo
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_counter_at')->nullable();

            $table->text('comments')->nullable(); // Glosa de amplio carácter
            $table->string('custom_field_1')->nullable(); // Campo libre 1
            $table->string('custom_field_2')->nullable(); // Campo libre 2

            // Extras
            $table->text('notes')->nullable();

            $table->timestamps();

            // Índices útiles
            $table->index('ip_address'); // Indexado pero NO unique (permite NULLs)
            $table->index('status');
            $table->index('mac_address');
            $table->unique(['location_id', 'mac_address'], 'printers_location_mac_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printers');
    }

};
