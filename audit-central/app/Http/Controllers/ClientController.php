<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\TenantContact;
use App\Models\AgentKey;
use App\Models\Tenant\AgentScanRange;
use App\Models\Tenant\AgentStatus; 
use App\Models\Tenant\Location;
use App\Services\TenantContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    private TenantContextService $tenantContext;

    public function __construct(TenantContextService $tenantContext)
    {
        $this->tenantContext = $tenantContext;
    }

    /**
     * Almacena un nuevo cliente y crea su infraestructura completa.
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Validación
        $validated = $request->validate([
            'rut' => 'required|string|max:12|unique:tenants,rut',
            'nombre' => 'required|string|max:255',
            'direccion' => 'required|string|max:255',
            'region' => 'required|string|max:100',
            'comuna' => 'required|string|max:100',
            'contactos' => 'required|array|min:1',
            'contactos.*.nombre' => 'required|string',
            'contactos.*.email' => 'required|email',
            'contactos.*.telefono' => 'nullable|string',

            // Campos de la Sucursal (Paso 2 del Wizard)
            'sucursal_nombre' => 'required|string|max:255',
            'sucursal_direccion' => 'required|string|max:255',
            'sucursal_nombre_contacto' => 'nullable|string|max:255',
            'sucursal_email_contacto' => 'nullable|email|max:255',
            'sucursal_telefono_contacto' => 'nullable|string|max:50',
            'sucursal_telefono_alternativo' => 'nullable|string|max:50',
            'sucursal_comentarios' => 'nullable|string',
        ]);

        try {
            // --- PASO 1: CREAR TENANT (Fuera de transacción para Postgres) ---
            $tenant = Tenant::create([
                'nombre'    => $validated['nombre'],
                'rut'       => $validated['rut'],
                'direccion' => $validated['direccion'],
                'region'    => $validated['region'],
                'comuna'    => $validated['comuna'],
                'created_by'=> $request->user()->id,
            ]);

            // A partir de aquí, si algo falla, el catch borrará el $tenant.

            // --- PASO 2: CONTACTOS COMERCIALES ---
            foreach ($validated['contactos'] as $con) {
                TenantContact::create([
                    'tenant_id' => $tenant->id,
                    'nombre'    => $con['nombre'],
                    'email'     => $con['email'],
                    'telefono'  => $con['telefono'] ?? null,
                ]);
            }

            // --- PASO 3: GENERAR LLAVE DE AGENTE ---
            $plainKey = strtoupper(Str::random(16));
            $key = AgentKey::create([
                'tenant_id' => $tenant->id,
                'name'      => 'Acceso Inicial: ' . $validated['sucursal_nombre'],
                'key_hash'  => hash('sha256', $plainKey),
                'active'    => true
            ]);

            // --- PASO 4: SETUP INICIAL EN LA DB DEL TENANT ---
            $agentInternalId = $tenant->run(function () use ($validated, $key) {
                Location::create([
                    'nombre'             => $validated['sucursal_nombre'],
                    'direccion'          => $validated['sucursal_direccion'],
                    'comuna'             => $validated['comuna'], 
                    'region'             => $validated['region'],
                    'nombre_contacto'    => $validated['sucursal_nombre_contacto'],
                    'email_contacto'     => $validated['sucursal_email_contacto'],
                    'telefono_contacto'  => $validated['sucursal_telefono_contacto'],
                    'telefono_alternativo' => $validated['sucursal_telefono_alternativo'],
                    'comentarios'        => $validated['sucursal_comentarios'],
                    'activo'             => true,
                ]);

                $agent = AgentStatus::create([
                    'agent_id'     => $key->id, 
                    'hostname'     => 'ESPERANDO INSTALACIÓN',
                    'status'       => 'offline',
                    'last_seen_at' => now(),
                ]);

                return $agent->id;
            });

            return response()->json([
                'success'     => true,
                'agent_key'   => $plainKey,
                'domain'      => $tenant->domains()->first()->domain,
                'agent_id'    => $agentInternalId,
                'client_code' => $tenant->code
            ], 201);

        } catch (\Exception $e) {
            // --- LIMPIEZA MANUAL (En lugar de Rollback) ---
            // Si el tenant alcanzó a crearse, lo borramos para que Stancl 
            // también elimine la base de datos que Postgres dejó a medias.
            if (isset($tenant)) {
                $tenant->delete();
            }

            Log::error("Fallo creación de infraestructura: " . $e->getMessage());
            
            return response()->json([
                'error'   => 'No se pudo crear la infraestructura.',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Configuración técnica del Agente (SNMP y Rangos IP)
     */
    public function setupAgent(Request $request, string $code, int $id): JsonResponse
    {
        $tenant = Tenant::where('code', $code)->firstOrFail();

        $validated = $request->validate([
            'snmp_community' => 'required|string',
            'ip_from'        => 'required|string',
            'ip_to'          => 'required|string',
            'subnet_mask'    => 'required|string',
        ]);

        $tenant->run(function () use ($id, $validated) {
            $agent = AgentStatus::findOrFail($id);
            $agent->update(['snmp_community' => $validated['snmp_community']]);

            AgentScanRange::updateOrCreate(
                ['agent_id' => $agent->id],
                [
                    'ip_from'     => $validated['ip_from'],
                    'ip_to'       => $validated['ip_to'],
                    'subnet_mask' => $validated['subnet_mask'],
                    'active'      => true
                ]
            );
        });

        return response()->json(['message' => 'Configuración guardada correctamente']);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $columns = ['id', 'code', 'nombre', 'status', 'rut', 'region', 'comuna', 'created_at'];
        $query = $user->isAdmin() ? Tenant::query() : $user->tenants();
        
        return response()->json(['clients' => $query->orderBy('nombre')->get($columns)]);
    }

    /**
     * Obtiene un cliente específico por código
     */
    public function show(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $tenant->load('contacts');
        
        $clientData = $tenant->only(['id', 'code', 'nombre', 'status', 'rut', 'region', 'comuna', 'direccion', 'created_at']);
        $clientData['contactos'] = $tenant->contacts;

        return response()->json(['client' => $clientData]);
    }

    /**
     * Actualiza un cliente existente
     */
    public function update(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) {
            return response()->json(['error' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'nombre'    => 'sometimes|required|string|max:255',
            'region'    => 'nullable|string|max:100',
            'comuna'    => 'nullable|string|max:100',
            'direccion' => 'nullable|string|max:255',
            'status'    => 'sometimes|in:active,suspended,maintenance,ended',
            
            'contactos' => 'sometimes|array',
            'contactos.*.nombre' => 'required|string|max:255',
            'contactos.*.email' => 'nullable|email|max:255',
            'contactos.*.telefono' => 'nullable|string|max:50',
            'contactos.*.telefono_alternativo' => 'nullable|string|max:50',
            'contactos.*.comentarios' => 'nullable|string',
        ]);

        try {
            DB::transaction(function () use ($tenant, $request, $validated) {
                $tenantData = collect($validated)->only(['nombre', 'region', 'comuna', 'direccion', 'status'])->all();
                $tenant->update($tenantData);

                if ($request->has('contactos')) {
                    $tenant->contacts()->delete();
                    $tenant->contacts()->createMany($validated['contactos']);
                }
            });

            $tenant->load('contacts');

            $clientData = $tenant->only(['id', 'code', 'nombre', 'status', 'rut', 'region', 'comuna', 'direccion', 'created_at']);
            $clientData['contactos'] = $tenant->contacts;

            return response()->json([
                'success' => true,
                'message' => 'Cliente actualizado exitosamente',
                'client'  => $clientData,
            ]);

        } catch (\Exception $e) {
            Log::error("Error al actualizar cliente {$code}: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Ocurrió un error al actualizar el cliente.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Elimina un cliente y su base de datos
     */
    public function destroy(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) return response()->json(['error' => 'Cliente no encontrado'], 404);

        // Aquí deberías implementar la lógica para eliminar la BD del tenant
        // Por ahora, solo marcamos como inactivo
        $tenant->update(['status' => 'inactive']);

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado exitosamente'
        ]);
    }

    public function tree(Request $request, string $code): JsonResponse
    {
        $tenant = $this->tenantContext->getTenantWithAccess($code, $request->user());
        if (!$tenant) return response()->json(['error' => 'Acceso denegado'], 403);

        $data = $tenant->run(function () {
            return Location::with(['printers' => function($q) {
                $q->select('id', 'location_id', 'serial_number', 'model', 'status');
            }])->where('activo', true)->get(['id', 'nombre', 'region', 'comuna']);
        });

        return response()->json([
            'client'    => $tenant->only(['nombre', 'code']),
            'locations' => $data,
        ]);
    }
}