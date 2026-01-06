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
        Schema::create('domains', function (Blueprint $table) {
            $table->id();
            
            // tenant_id es UUID
            $table->uuid('tenant_id');
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->cascadeOnDelete();

            // Dominio principal o custom
            // Ej: acmecorp-xyz8k2p.app.cl
            $table->string('domain')->unique()->index();

            // Tipo de dominio
            $table->enum('type', ['primary', 'custom', 'legacy'])
                ->default('primary')
                ->comment('primary: empresa.app.cl, custom: dominio propio, legacy: migraciones');

            // Estado del dominio
            $table->enum('status', ['active', 'inactive', 'suspended'])
                ->default('active')
                ->index();

            // Certificado SSL (si usas Let\'s Encrypt)
            $table->timestamp('ssl_certificate_expires_at')->nullable();

            // Auditoría
            $table->timestamps();
            $table->softDeletes();

            // Índices para queries frecuentes
            $table->index(['tenant_id', 'status']);
            $table->index('domain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('domains');
    }
};
