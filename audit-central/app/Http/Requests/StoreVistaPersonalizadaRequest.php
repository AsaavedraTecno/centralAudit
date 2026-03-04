<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVistaPersonalizadaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // El usuario solo puede crear vistas para sí mismo
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'nombre' => [
                'required',
                'string',
                'max:100',
                'unique:vistas_personalizadas,nombre,NULL,id,user_id,' . auth()->id(),
            ],

            'descripcion' => 'nullable|string|max:500',

            'columnas' => [
                'required',
                'array',
                'min:1',
            ],

            'columnas.*.identificador' => 'required|string',
            'columnas.*.visible' => 'required|boolean',
            'columnas.*.orden' => 'required|integer|min:1',
            'columnas.*.ancho' => 'required|integer|min:50|max:500',

            'es_default' => 'nullable|boolean',
        ];
    }

    /**
     * Get custom error messages
     */
    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre de la vista es requerido',
            'nombre.max' => 'El nombre no puede exceder 100 caracteres',
            'nombre.unique' => 'Ya tienes una vista con este nombre',
            'columnas.required' => 'Debes seleccionar al menos una columna',
            'columnas.min' => 'Debes seleccionar al menos una columna',
        ];
    }

    /**
     * Preparar los datos antes de validación
     */
    protected function prepareForValidation(): void
    {
        // Asegurar que user_id sea el del usuario autenticado
        $this->merge([
            'user_id' => auth()->id(),
        ]);
    }
}