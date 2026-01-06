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
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('printer_id')->constrained('printers')->cascadeOnDelete();
            $table->string('code');
            $table->string('severity')->default('info'); // info|warn|critical
            $table->string('message')->nullable();
            $table->timestamp('raised_at')->index();
            $table->timestamp('cleared_at')->nullable();
            $table->timestamps();

            $table->index(['printer_id', 'raised_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
