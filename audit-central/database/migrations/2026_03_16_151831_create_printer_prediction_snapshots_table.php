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
    Schema::create('printer_prediction_snapshots', function (Blueprint $table) {
        $table->id();

        // referencia al tenant
        $table->uuid('tenant_id')->index();
        $table->string('tenant_code')->index();

        // ubicación
        $table->bigInteger('location_id')->nullable();
        $table->string('location_name')->nullable();

        // impresora
        $table->bigInteger('printer_id');
        $table->string('printer_name');
        $table->string('model')->nullable();

        // predicciones
        $table->integer('risk_score')->default(0);
        $table->string('most_critical_supply')->nullable();
        $table->integer('days_remaining')->nullable();

        // métricas
        $table->integer('monthly_volume')->nullable();
        $table->boolean('anomaly')->default(false);

        // timestamps
        $table->timestamp('snapshot_at')->index();
        $table->timestamps();

        $table->index(['tenant_id', 'location_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_prediction_snapshots');
    }
};
