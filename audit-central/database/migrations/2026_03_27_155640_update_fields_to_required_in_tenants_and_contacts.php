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
        // 1. Modificar tabla TENANTS
        Schema::table('tenants', function (Blueprint $table) {
            // Pasamos de nullable a obligatorio
            $table->string('direccion')->nullable(false)->change();
            $table->string('comuna')->nullable(false)->change();
            $table->string('region')->nullable(false)->change();
        });

        // 2. Modificar tabla CONTACT_CLIENT
        Schema::table('contact_client', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
            $table->string('telefono')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        // Por si necesitas revertir, los volvemos a hacer nullable
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('direccion')->nullable()->change();
            $table->string('comuna')->nullable()->change();
            $table->string('region')->nullable()->change();
        });

        Schema::table('contact_client', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('telefono')->nullable()->change();
        });
    }      
};
