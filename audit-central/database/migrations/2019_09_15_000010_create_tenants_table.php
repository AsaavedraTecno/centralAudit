<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTenantsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();                 // Slug legible (ej: "acmecorp")
            $table->json('data')->nullable();                 // JSON requerido por Stancl Tenancy

            // Identificación y administración del tenant
            $table->string('name');                           // Nombre del cliente (informativo)

            // Conexión a la base de datos del tenant
            $table->string('db_name')->unique();              // Nombre DB: audit-central_tenant_{uuid}
            $table->string('db_host')->default('127.0.0.1');  // Host DB
            $table->string('db_user')->default('postgres');   // Usuario DB
            $table->text('db_password');                       // Password encriptado

            // Estado y control
            $table->enum('status', ['active', 'suspended', 'maintenance'])->default('active');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');

    }
}
