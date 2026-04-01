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

            $table->bigInteger('scan_pages')->default(0)->after('color_pages');
            $table->bigInteger('copy_pages')->default(0)->after('scan_pages');
            $table->bigInteger('fax_pages')->default(0)->after('copy_pages');
            $table->bigInteger('print_pages')->default(0)->after('fax_pages');
            $table->bigInteger('duplex_pages')->default(0)->after('print_pages');
            $table->bigInteger('engine_cycles')->default(0)->after('duplex_pages');


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
        Schema::table('printer_counters', function (Blueprint $table) {
            $table->dropColumn([
                'scan_pages', 
                'copy_pages', 
                'fax_pages', 
                'print_pages',
                'duplex_pages'
            ]);
        });
    }
};
