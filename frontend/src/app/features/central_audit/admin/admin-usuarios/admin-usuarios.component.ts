import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioService, Usuario } from '../../../../core/services/usuario.service';
import { RoleService} from '../../../../core/services/role.service';
import { ClienteService } from '../../../../core/services/cliente.service';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-usuarios.component.html',
  styleUrls: ['./admin-usuarios.component.scss']
})  
export class AdminUsuariosComponent implements OnInit {
  
  // --- CONTROL DE VISTAS (Nuevo Diseño) ---
  vistaActual: 'lista' | 'crear' | 'editar' = 'lista';

  // --- VARIABLES DE ESTADO Y MENSAJES ---
  isSaving: boolean = false;
  isDeleting: boolean = false;
  formError: string = '';
  formExito: string = '';

  userEmail: string = '';
  userRole: string = '';
  userIdActual: number = 0;

  usuarios: Usuario[] = [];
  loadingUsuarios = true;

  clientesDisponibles: any[] = [];
  clientesSeleccionados: Set<string> = new Set();
  seleccionarTodos = false;

  rolesDisponibles: {id: number, name: string, color: string}[] = [];

  modalEliminarUsuarioAbierto = false;
  usuarioAEliminar: Usuario | null = null;
  
  usuarioAEditar: any = null;
  clientesAsignadosOriginal: string[] = [];

  nuevoUsuario: any = { name: '', email: '', role_id: null, active: true, clientes: [] };

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private roleService: RoleService,
    private clienteService: ClienteService
  ) {}

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: (response) => {
        this.userRole = response.user?.role || response.role || '';
        this.userIdActual = response.user?.id || 0;
        this.userEmail = response.user?.email || '';
        this.cargarUsuarios();
        this.cargarClientes();
        this.cargarRoles();
      },
      error: (err) => console.error('Error me():', err)
    });
  }

  // ==========================================
  // NAVEGACIÓN ENTRE VISTAS
  // ==========================================

  volverALista(): void {
    this.vistaActual = 'lista';
    this.usuarioAEditar = null;
    this.nuevoUsuario = { name: '', email: '', role_id: null, active: true, clientes: [] };
    this.clientesSeleccionados.clear();
    this.seleccionarTodos = false;
    this.limpiarMensajes();
  }

  abrirVistaCrear(): void {
    this.vistaActual = 'crear';
    this.nuevoUsuario = { name: '', email: '', role_id: null, active: true, clientes: [] };
    this.clientesSeleccionados.clear();
    this.seleccionarTodos = false;
    this.limpiarMensajes();
  }

  abrirVistaEditar(usuario: Usuario): void {
    this.usuarioAEditar = JSON.parse(JSON.stringify(usuario));
    if (!this.usuarioAEditar.role_id && this.usuarioAEditar.role) {
      const rolEncontrado = this.rolesDisponibles.find(r => r.name.toLowerCase() === this.usuarioAEditar.role.toLowerCase());
      if (rolEncontrado) this.usuarioAEditar.role_id = rolEncontrado.id;
    }
    const tenantAssignments = (usuario as any).tenantAssignments || (usuario as any).tenant_assignments || [];
    this.clientesAsignadosOriginal = tenantAssignments.map((t: any) => (t.tenant_id ?? t.id ?? t));
    this.usuarioAEditar.clientes = [...this.clientesAsignadosOriginal];
    
    this.limpiarMensajes();
    this.vistaActual = 'editar';
  }

  limpiarMensajes(): void {
    this.formError = '';
    this.formExito = '';
    this.isSaving = false;
  }

  // ==========================================
  // LÓGICA DE DATOS Y SERVICIOS
  // ==========================================

  cargarRoles(): void {
    this.roleService.getRolesList().subscribe({
      next: (response) => {
        this.rolesDisponibles = response;
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.rolesDisponibles = [];
      }
    });
  }

  cargarUsuarios(): void {
    this.loadingUsuarios = true;
    this.usuarioService.getUsuarios().subscribe({
      next: (response) => {
        const usuariosData = response.users;
        if (usuariosData && typeof usuariosData === 'object') {
          this.usuarios = Array.isArray(usuariosData.data) ? usuariosData.data : (Array.isArray(usuariosData) ? usuariosData : []);
        } else {
          this.usuarios = Array.isArray(usuariosData) ? usuariosData : [];
        }
        this.loadingUsuarios = false;
      },
      error: (error) => { console.error('Error al cargar usuarios:', error); this.usuarios = []; this.loadingUsuarios = false; }
    });
  }

  crearUsuario(): void {
    this.limpiarMensajes();

    if (!this.nuevoUsuario.name || !this.nuevoUsuario.email || !this.nuevoUsuario.role_id) {
      this.formError = 'Por favor complete todos los campos obligatorios.';
      return;
    }

    this.isSaving = true;

    const payload = {
      name: this.nuevoUsuario.name,
      email: this.nuevoUsuario.email,
      role_id: this.nuevoUsuario.role_id,
      active: this.nuevoUsuario.active,
      tenants: this.getClientesSeleccionados()
    };

    this.usuarioService.createUsuario(payload).subscribe({
      next: () => {
        this.formExito = 'Usuario creado exitosamente.';
        this.cargarUsuarios();
        
        setTimeout(() => {
          this.volverALista();
        }, 1500);
      },
      error: (err) => { 
        console.error('Error:', err); 
        this.formError = err.error?.message || 'Error al crear usuario. Verifica los datos.';
        this.isSaving = false;
      }
    });
  }

  actualizarUsuario(): void {
    if (!this.usuarioAEditar) return;
    
    this.limpiarMensajes();
    this.isSaving = true;

    const id = this.usuarioAEditar.id;
    const payload: any = { name: this.usuarioAEditar.name, email: this.usuarioAEditar.email, role_id: this.usuarioAEditar.role_id };
    if (typeof this.usuarioAEditar.active !== 'undefined') payload.active = this.usuarioAEditar.active;
    const actuales: string[] = Array.isArray(this.usuarioAEditar.clientes) ? this.usuarioAEditar.clientes.map(String) : [];
    const originales: string[] = this.clientesAsignadosOriginal.map(String);
    const iguales = actuales.length === originales.length && actuales.every(v => originales.includes(v));
    
    if (!iguales) payload.tenants = actuales.map(tid => ({ tenant_id: tid, scope: 'full' }));
    
    this.usuarioService.updateUsuario(id, payload).subscribe({ 
      next: () => { 
        this.formExito = 'Usuario actualizado exitosamente.';
        this.cargarUsuarios();
        
        setTimeout(() => {
          this.volverALista(); 
        }, 1500);
      }, 
      error: (err) => { 
        console.error('Error al actualizar usuario:', err); 
        this.formError = err.error?.message || 'Error al actualizar usuario.';
        this.isSaving = false;
      } 
    });
  }

  cargarClientes(): void {
    this.clienteService.getClientesList().subscribe({
      next: (response) => {
        const clientes = response.clients || [];
        this.clientesDisponibles = clientes.map((cliente: any) => ({ id: cliente.id, nombre: cliente.nombre, code: cliente.code, status: cliente.status }));
      },
      error: (error) => { console.error('Error al cargar clientes:', error); this.clientesDisponibles = []; }
    });
  }

  // --- LÓGICA DE CLIENTES EN CREACIÓN ---
  toggleSeleccionarTodos(): void {
    if (this.seleccionarTodos) {
      this.clientesSeleccionados.clear();
      this.clientesDisponibles.forEach(c => this.clientesSeleccionados.add(c.id));
    } else {
      this.clientesSeleccionados.clear();
    }
  }

  toggleCliente(clienteId: string): void {
    if (this.clientesSeleccionados.has(clienteId)) this.clientesSeleccionados.delete(clienteId);
    else this.clientesSeleccionados.add(clienteId);
    this.actualizarEstadoTodos();
  }

  actualizarEstadoTodos(): void {
    if (this.clientesDisponibles.length === 0) { this.seleccionarTodos = false; return; }
    this.seleccionarTodos = this.clientesDisponibles.every(c => this.clientesSeleccionados.has(c.id));
  }

  isClienteSeleccionado(clienteId: string): boolean { 
    return this.clientesSeleccionados.has(clienteId); 
  }

  getClientesSeleccionados(): any[] { 
    return Array.from(this.clientesSeleccionados).map(id => ({ tenant_id: id, scope: 'full' })); 
  }

  // --- LÓGICA DE CLIENTES EN EDICIÓN ---
  get todosSeleccionadosEditar(): boolean {
    if (!this.clientesDisponibles.length || !this.usuarioAEditar) return false;
    return this.usuarioAEditar.clientes.length === this.clientesDisponibles.length;
  }

  toggleTodosEditar(event: any): void {
    const checked = event.target.checked;
    if (checked) {
      this.usuarioAEditar.clientes = this.clientesDisponibles.map(c => c.id);
    } else {
      this.usuarioAEditar.clientes = [];
    }
  }

  toggleClienteAsignadoEditar(clienteId: any): void {
    if (!this.usuarioAEditar) return;
    const idx = this.usuarioAEditar.clientes.indexOf(clienteId);
    if (idx === -1) {
      this.usuarioAEditar.clientes.push(clienteId); 
    } else {
      this.usuarioAEditar.clientes.splice(idx, 1);
    }
  }

  // --- ACCIONES RÁPIDAS (Activar/Desactivar/Eliminar) ---
  toggleUsuarioActivo(usuarioId: number, estadoActual: boolean): void {
    this.usuarioService.updateUsuarioActivo(usuarioId, !estadoActual).subscribe({ 
      next: () => this.cargarUsuarios(), error: (error) => console.error('Error al actualizar usuario:', error) 
    });
  }

  abrirModalEliminarUsuario(usuario: Usuario): void { 
    this.usuarioAEliminar = usuario; 
    this.modalEliminarUsuarioAbierto = true; 
  }

  cerrarModalEliminarUsuario(): void {
    this.modalEliminarUsuarioAbierto = false;
    this.usuarioAEliminar = null;
    this.isDeleting = false;
  }

  confirmarEliminarUsuario(): void {
    if (!this.usuarioAEliminar) return;
    
    this.isDeleting = true; 
    console.log('Cambiando isDeleting a:', this.isDeleting); 

    this.usuarioService.deleteUsuario(this.usuarioAEliminar.id).subscribe({ 
      next: () => { 
        this.cargarUsuarios(); 
        this.cerrarModalEliminarUsuario(); 
      }, 
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.isDeleting = false; 
      } 
    });
  }

  // --- UTILIDADES ---
  getRoleColor(roleName: string | undefined): string {
    if (!roleName) {
      return '#6c757d'; 
    }
    const role = this.rolesDisponibles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    return role?.color || '#6c757d';
  }
}