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
  userEmail: string = '';
  userRole: string = '';
  userIdActual: number = 0;

  usuarios: Usuario[] = [];
  loadingUsuarios = false;

  clientesDisponibles: any[] = [];
  clientesSeleccionados: Set<string> = new Set();
  seleccionarTodos = false;

  rolesDisponibles: {id: number, name: string, color: string}[] = [];

  modalEliminarUsuarioAbierto = false;
  modalEditarUsuarioAbierto = false;
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
    if (!this.nuevoUsuario.name || !this.nuevoUsuario.email || !this.nuevoUsuario.role_id) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    const payload = {
      name: this.nuevoUsuario.name,
      email: this.nuevoUsuario.email,
      role_id: this.nuevoUsuario.role_id,
      active: this.nuevoUsuario.active,
      tenants: this.getClientesSeleccionados()
    };

    this.usuarioService.createUsuario(payload).subscribe({
      next: () => {
        alert('Usuario creado exitosamente');
        this.nuevoUsuario = { name: '', email: '', role_id: null, active: true, clientes: [] };
        this.clientesSeleccionados.clear();
        this.actualizarEstadoTodos();
        this.cargarUsuarios();
      },
      error: (err) => { console.error('Error:', err); alert('Error al crear usuario: ' + (err.error?.message || 'Error desconocido')); }
    });
  }

  cargarClientes(): void {
    this.clienteService.getClientesList().subscribe({
      next: (response) => {
        const clientes = response.clients || [];
        this.clientesDisponibles = clientes.map((cliente: any) => ({ id: cliente.id, nombre: cliente.nombre, code: cliente.code, status: cliente.status }));
        console.log('Clientes disponibles cargados:', this.clientesDisponibles);
      },
      error: (error) => { console.error('Error al cargar clientes:', error); this.clientesDisponibles = []; }
    });
  }

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

  isClienteSeleccionado(clienteId: string): boolean { return this.clientesSeleccionados.has(clienteId); }

  getClientesSeleccionados(): any[] { return Array.from(this.clientesSeleccionados).map(id => ({ tenant_id: id, scope: 'full' })); }

  toggleUsuarioActivo(usuarioId: number, estadoActual: boolean): void {
    this.usuarioService.updateUsuarioActivo(usuarioId, !estadoActual).subscribe({ next: () => this.cargarUsuarios(), error: (error) => console.error('Error al actualizar usuario:', error) });
  }

  abrirModalEliminarUsuario(usuario: Usuario): void { this.usuarioAEliminar = usuario; this.modalEliminarUsuarioAbierto = true; }
  cerrarModalEliminarUsuario(): void { this.usuarioAEliminar = null; this.modalEliminarUsuarioAbierto = false; }

  confirmarEliminarUsuario(): void {
    if (!this.usuarioAEliminar) return;
    this.usuarioService.deleteUsuario(this.usuarioAEliminar.id).subscribe({ next: () => { this.cerrarModalEliminarUsuario(); this.cargarUsuarios(); }, error: (err) => console.error('Error al eliminar usuario:', err) });
  }

  abrirModalEditarUsuario(usuario: Usuario): void {
    this.usuarioAEditar = JSON.parse(JSON.stringify(usuario));
    if (!this.usuarioAEditar.role_id && this.usuarioAEditar.role) {
      const rolEncontrado = this.rolesDisponibles.find(r => r.name.toLowerCase() === this.usuarioAEditar.role.toLowerCase());
      if (rolEncontrado) this.usuarioAEditar.role_id = rolEncontrado.id;
    }
    const tenantAssignments = (usuario as any).tenantAssignments || (usuario as any).tenant_assignments || [];
    this.clientesAsignadosOriginal = tenantAssignments.map((t: any) => (t.tenant_id ?? t.id ?? t));
    this.usuarioAEditar.clientes = [...this.clientesAsignadosOriginal];
    this.modalEditarUsuarioAbierto = true;
  }

  cerrarModalEditarUsuario(): void { this.usuarioAEditar = null; this.clientesAsignadosOriginal = []; this.modalEditarUsuarioAbierto = false; }

  toggleClienteAsignadoEditar(clienteId: any): void {
    if (!this.usuarioAEditar) return;
    const idx = this.usuarioAEditar.clientes.indexOf(clienteId);
    if (idx === -1) this.usuarioAEditar.clientes.push(clienteId); else this.usuarioAEditar.clientes.splice(idx, 1);
  }

  actualizarUsuario(): void {
    if (!this.usuarioAEditar) return;
    const id = this.usuarioAEditar.id;
    const payload: any = { name: this.usuarioAEditar.name, email: this.usuarioAEditar.email, role_id: this.usuarioAEditar.role_id };
    if (typeof this.usuarioAEditar.active !== 'undefined') payload.active = this.usuarioAEditar.active;
    const actuales: string[] = Array.isArray(this.usuarioAEditar.clientes) ? this.usuarioAEditar.clientes.map(String) : [];
    const originales: string[] = this.clientesAsignadosOriginal.map(String);
    const iguales = actuales.length === originales.length && actuales.every(v => originales.includes(v));
    if (!iguales) payload.tenants = actuales.map(tid => ({ tenant_id: tid, scope: 'full' }));
    console.log('Payload actualización usuario:', payload);
    this.usuarioService.updateUsuario(id, payload).subscribe({ next: () => { this.cerrarModalEditarUsuario(); this.cargarUsuarios(); }, error: (err) => { console.error('Error al actualizar usuario:', err); alert(err.error?.message || 'Error al actualizar usuario'); } });
  }

  getRoleColor(roleName: string | undefined): string {
    if (!roleName) {
      return '#6c757d'; // Color por defecto (gris) si no tiene rol
    }
    // Busca el rol en la lista de roles disponibles
    const role = this.rolesDisponibles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    // Devuelve el color del rol encontrado, o el color por defecto si no lo encuentra
    return role?.color || '#6c757d';
  }

}
