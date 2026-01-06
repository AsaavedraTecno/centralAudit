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
        Schema::create('agent_keys', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id');
            $table->string('name'); // "Agente Sucursal Centro", "Agente HQ"
            $table->string('key_hash'); // Hash::make(key) - la key plana se entrega al cliente una sola vez
            $table->boolean('active')->default(true);
            $table->timestamp('last_seen_at')->nullable();
            $table->string('last_ip')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_keys');
    }
};
