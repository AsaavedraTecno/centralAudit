<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateVistaPersonalizadaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Validar que la vista pertenezca al usuario autenticado
        $vista = $this->route('vistaPersonalizada');
        return $vista && $vista->user_id === auth()->id();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $vistaId = $this->route('vistaPersonalizada')?->id;

        return [
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                'unique:vistas_personalizadas,nombre,' . $vistaId . ',id,user_id,' . auth()->id(),
            ],

            'descripcion' => 'nullable|string|max:500',

            'columnas' => [
                'sometimes',
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
            'nombre.unique' => 'Ya tienes una vista con este nombre',
            'columnas.min' => 'Debes seleccionar al menos una columna',
        ];
    }
}