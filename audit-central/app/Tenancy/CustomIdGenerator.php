<?php

namespace App\Tenancy;

/**
 * Custom ID Generator que genera solo 8 caracteres hexadecimales
 * En lugar del UUID completo, usa solo 8 dígitos hexadecimales
 * 
 * Con prefix 'audit_central_t' en config, resulta:
 * audit_central_t + {8-chars} = audit_central_ta45af111
 */
class CustomIdGenerator
{
    public function generate(): string
    {
        // Generar 8 caracteres hexadecimales aleatorios
        return bin2hex(random_bytes(4));
    }
}
