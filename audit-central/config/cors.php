<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'tenant/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://tdmonitor.cl:4200',
        'http://localhost:4200',
            /*'https://tdmonitor.cl',
            'http://localhost:4200',    // Asegúrate de que esta URL sea exacta
            'http://127.0.0.1:4200',    // Opcional, pero útil si usas la IP*/
    ],
    'allowed_origins_patterns' => [
        '#^https?://([a-zA-Z0-9-]+\.)?tdmonitor\.cl(:[0-9]+)?$#',
        '#^http://localhost(:[0-9]+)?$#',
        '#^http://127\.0\.0\.1(:[0-9]+)?$#'
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];