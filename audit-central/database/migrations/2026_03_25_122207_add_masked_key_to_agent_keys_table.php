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
        Schema::table('agent_keys', function (Blueprint $table) {
            // Guardamos la versión visual: **********LMNPQ
            $table->string('masked_key', 25)->nullable()->after('key_hash');
            
            $table->index('masked_key');
        });
    }

    public function down(): void
    {
        Schema::table('agent_keys', function (Blueprint $table) {
            $table->dropColumn('masked_key');
        });
    }
};
