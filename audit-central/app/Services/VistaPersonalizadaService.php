<?php

namespace App\Services;

use App\Models\VistaPersonalizada;
use App\Models\ColumnasDisponibles;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\Paginator;

class VistaPersonalizadaService
{
    /**
     * Obtener todas las vistas de un usuario
     */
    public function obtenerVistasUsuario(int $usuarioId): Collection
    {
        $vistas = VistaPersonalizada::delUsuario($usuarioId)
        ->ordenadas()
        ->get();

        return $vistas->map(function ($vista) {
            return $this->prepararVista($vista);
        });
    }

    /**
     * Obtener la vista por defecto de un usuario
     * Si no existe, crear una vista por defecto con todas las columnas
     */
    public function obtenerVistaPorDefecto(int $usuarioId): VistaPersonalizada
    {
        $vista = VistaPersonalizada::default($usuarioId)->first();

        if (!$vista) {
            // Crear la vista por defecto con todas las columnas disponibles
            $vista = $this->crearVistaPorDefecto($usuarioId);
        }

        return $this->prepararVista($vista);
    }

    /**
     * Crear la vista por defecto del sistema (todas las columnas)
     */
    public function crearVistaPorDefecto(int $usuarioId): VistaPersonalizada
    {
        $columnasDefault = $this->obtenerColumnasDefault();

        return VistaPersonalizada::create([
            'user_id' => $usuarioId,
            'nombre' => 'Vista Completa',
            'descripcion' => 'Vista por defecto con todas las columnas disponibles',
            'columnas' => $columnasDefault,
            'es_default' => true,
        ]);
    }

    /**
     * Duplicar una vista existente
     */
    public function duplicarVista(VistaPersonalizada $vista, int $usuarioId): VistaPersonalizada
    {
        $nombreOriginal = $vista->nombre;
        $nombreDuplicado = $this->generarNombreDuplicado($nombreOriginal, $usuarioId);

        return VistaPersonalizada::create([
            'user_id' => $usuarioId,
            'nombre' => $nombreDuplicado,
            'descripcion' => $vista->descripcion . ' (copia)',
            'columnas' => $vista->columnas,
            'filtros' => $vista->filtros,
            'es_default' => false,
        ]);
    }

    /**
     * Generar un nombre único para la vista duplicada
     * Ejemplo: "Vista Original" → "Vista Original (copia 1)"
     */
    private function generarNombreDuplicado(string $nombreOriginal, int $usuarioId): string
    {
        $nombreBase = str_contains($nombreOriginal, '(copia') 
            ? preg_replace('/\s*\(copia\s+\d+\)/', '', $nombreOriginal)
            : $nombreOriginal;

        $contador = 1;
        $nombreCandidato = $nombreBase . ' (copia ' . $contador . ')';

        // Buscar el primer nombre disponible
        while (VistaPersonalizada::where('user_id', $usuarioId)
            ->where('nombre', $nombreCandidato)
            ->exists()) {
            $contador++;
            $nombreCandidato = $nombreBase . ' (copia ' . $contador . ')';
        }

        return $nombreCandidato;
    }

    /**
     * Validar que una vista no exceda el límite de vistas por usuario
     */
    public function validarLimiteSistema(int $usuarioId, int $limite = 10): bool
    {
        $countVistas = VistaPersonalizada::where('user_id', $usuarioId)->count();
        return $countVistas < $limite;
    }

    /**
     * Obtener las columnas por defecto del sistema
     * IMPORTANTE: Este arreglo debe coincidir con el de frontend
     */
    public function obtenerColumnasDefault(): array
    {
        // Leer de BD en lugar de retornar array
        return ColumnasDisponibles::activas()->get()->toArray();
    }

    private function prepararVista(VistaPersonalizada $vista): VistaPersonalizada
    {
        // 🔹 1. Sincronizar columnas nuevas
        $columnasSistema = $this->obtenerColumnasDefault();

        $columnasVista = collect($vista->columnas);
        $identificadoresVista = $columnasVista->pluck('identificador')->toArray();

        foreach ($columnasSistema as $colSistema) {
            if (!in_array($colSistema['identificador'], $identificadoresVista)) {
                $vista->columnas[] = [
                    'identificador' => $colSistema['identificador'],
                    'visible' => false,
                    'orden' => $colSistema['orden'],
                    'ancho' => $colSistema['ancho'],
                ];
            }
        }

        // 🔹 2. Ordenar columnas por orden
        $vista->columnas = collect($vista->columnas)
            ->sortBy('orden')
            ->values()
            ->toArray();

        return $vista;
    }

}