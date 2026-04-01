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
            $table->string('code')->unique(); 
            $table->json('data')->nullable(); // Stancl requiere esto

            // --- Identificación ---
            $table->string('nombre');
            $table->string('rut')->unique();
            $table->string('logo_url')->nullable();


            // --- Conexión DB ---
            $table->string('db_name')->unique();
            $table->string('db_host')->default('127.0.0.1');
            $table->string('db_user')->default('postgres');
            $table->text('db_password');

            $table->string('direccion')->nullable();
            $table->string('comuna')->nullable();
            $table->string('region')->nullable();

            // --- Estado ---
            $table->enum('status', ['active', 'suspended', 'maintenance'])->default('active');

            // Relación con el usuario admin que lo crea
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');

            //$table->integer('device_limit')->default(1); 
            $table->integer('user_limit')->default(5);

            // --- Personalización ---

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
