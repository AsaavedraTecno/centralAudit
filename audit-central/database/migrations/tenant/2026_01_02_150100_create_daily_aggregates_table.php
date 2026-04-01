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
        Schema::create('daily_aggregates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained('printers')->cascadeOnDelete();
            $table->date('date')->index();
            $table->integer('total_pages')->default(0);
            $table->integer('bw_pages')->default(0);
            $table->integer('color_pages')->default(0);

            $table->bigInteger('engine_cycles')->default(0);
            
            $table->json('supplies_avg')->nullable();
            $table->timestamps();

            $table->unique(['printer_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_aggregates');
    }
};
