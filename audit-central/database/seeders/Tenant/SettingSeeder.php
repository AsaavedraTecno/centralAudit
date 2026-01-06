<?php

namespace Database\Seeders\Tenant;

use App\Models\Tenant\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['key' => 'alert_threshold_toner', 'value' => '20', 'type' => 'integer'],
            ['key' => 'alert_threshold_critical', 'value' => '5', 'type' => 'integer'],
            ['key' => 'offline_timeout_minutes', 'value' => '30', 'type' => 'integer'],
            ['key' => 'timezone', 'value' => 'America/Santiago', 'type' => 'string'],
            ['key' => 'language', 'value' => 'es', 'type' => 'string'],
            ['key' => 'enable_email_alerts', 'value' => 'true', 'type' => 'boolean'],
            ['key' => 'alert_recipient_emails', 'value' => '[]', 'type' => 'json'],
        ];

        foreach ($defaults as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'type' => $setting['type']]
            );
        }

        echo "✅ Configuraciones por defecto creadas\n";
    }
}
