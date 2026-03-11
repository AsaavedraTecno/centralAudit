<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vista_tenants', function (Blueprint $table) {
            $table->id();

            $table->foreignId('vista_id')
                ->constrained('vistas_personalizadas')
                ->cascadeOnDelete();

            $table->uuid('tenant_id');

            $table->timestamps();

            $table->unique('tenant_id');

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vista_tenants');
    }
};