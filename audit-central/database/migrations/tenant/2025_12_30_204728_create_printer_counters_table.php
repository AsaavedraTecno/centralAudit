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
        Schema::create('printer_counters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained('printers')->cascadeOnDelete();
            $table->bigInteger('total_pages')->default(0);
            $table->bigInteger('bw_pages')->default(0);
            $table->bigInteger('color_pages')->default(0);
            $table->timestamp('collected_at')->index();

            $table->timestamps();

            $table->index(['printer_id', 'collected_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_counters');
    }
};
