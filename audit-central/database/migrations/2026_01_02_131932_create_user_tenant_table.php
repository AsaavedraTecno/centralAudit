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
        Schema::create('user_tenant', function (Blueprint $table) {
            $table->id();

            // Relación con el usuario global (Administradores o Clientes con acceso)
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Relación con el Tenant (Empresa)
            $table->uuid('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();

            // Atributos de acceso
            $table->string('role')->default('viewer'); 
            $table->timestamps();

            // Evita que un usuario se asigne dos veces a la misma empresa
            $table->unique(['user_id', 'tenant_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_tenant');
    }
};
