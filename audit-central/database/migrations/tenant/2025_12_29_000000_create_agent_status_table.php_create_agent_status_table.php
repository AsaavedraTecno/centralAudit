<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_status', function (Blueprint $table) {
            $table->id();
            $table->string('agent_id'); // referencia a central.agent_keys.id (sin FK para evitar JOIN entre DBs)
            $table->string('hostname')->index();
            $table->string('ip_address', 45)->nullable();
            $table->string('version')->nullable();
            $table->timestamp('last_seen_at')->index();
            $table->string('status')->default('online'); // online, offline, error
            $table->string('label')->nullable();
            $table->string('snmp_community')->default('public');
            $table->integer('scan_interval_minutes')->default(15);
            $table->foreignId('location_id')
                            ->nullable()
                            ->constrained('locations')
                            ->nullOnDelete();
            
            $table->timestamps();

            $table->unique('agent_id');
            $table->index(['status', 'last_seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_status');
    }
};
