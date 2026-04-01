import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService, Role } from '../../../../core/services/role.service';
import { PermissionService } from '../../../../core/services/permission.service';
import { ColorPickerDirective } from 'ngx-color-picker';

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ColorPickerDirective],
  templateUrl: './admin-roles.html',
  styleUrls: ['./admin-roles.scss']
})
export class AdminRolesComponent implements OnInit {
  
  // --- CONTROL DE VISTAS ---
  vistaActual: 'lista' | 'crear' | 'editar' = 'lista';

  // --- ESTADOS DE CARGA Y MENSAJES ---
  isSaving = false;
  isDeleting = false;
  loadingRoles = true; // Empieza en true para evitar el flash de "no hay datos"
  formError = '';
  formExito = '';

  roles: Role[] = [];
  permisosDisponibles: any = {};
  todosLosPermisos: any[] = []; 
  
  nuevoRol: { name: string, description: string , color: string} = { name: '', description: '', color: '#cccccc' };
  permisosSeleccionadosNuevo: Set<number> = new Set();
  seleccionarTodosNuevo = false;

  modalEliminarRolAbierto = false;
  rolAEliminar: Role | null = null;

  rolAEditar: any = null;
  permisosSeleccionadosEditar: Set<number> = new Set();
  seleccionarTodosEditar = false;

  objectKeys = Object.keys;

  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarPermisos();
  }

  // ==========================================
  // NAVEGACIÓN Y LIMPIEZA
  // ==========================================

  volverALista(): void {
    this.vistaActual = 'lista';
    this.limpiarEstados();
  }

  abrirVistaCrear(): void {
    this.vistaActual = 'crear';
    this.nuevoRol = { name: '', description: '', color: '#cccccc' };
    this.permisosSeleccionadosNuevo.clear();
    this.seleccionarTodosNuevo = false;
    this.limpiarEstados();
  }

  abrirVistaEditar(rol: Role): void {
    this.rolAEditar = JSON.parse(JSON.stringify(rol)); 
    this.permisosSeleccionadosEditar.clear();
    if (this.rolAEditar.permissions) {
      this.rolAEditar.permissions.forEach((p: any) => this.permisosSeleccionadosEditar.add(p.id));
    }
    this.actualizarEstadoTodos('edit');
    this.limpiarEstados();
    this.vistaActual = 'editar';
  }

  limpiarEstados(): void {
    this.formError = '';
    this.formExito = '';
    this.isSaving = false;
    this.isDeleting = false;
  }

  // ==========================================
  // LÓGICA DE DATOS
  // ==========================================

  cargarRoles(): void {
    this.loadingRoles = true;
    this.roleService.getRoles().subscribe({
      next: (response) => {
        this.roles = response?.roles?.data || [];
        this.loadingRoles = false;
      },
      error: (error) => {
        console.error('Error roles:', error);
        this.loadingRoles = false;
      }
    });
  }

  cargarPermisos(): void {
    this.permissionService.getPermissionsList().subscribe({
      next: (response) => {
        this.permisosDisponibles = response;
        this.todosLosPermisos = Object.values(response).flat();
      },
      error: (error) => console.error('Error permisos:', error)
    });
  }

  crearRol(): void {
    if (!this.nuevoRol.name) {
      this.formError = 'El nombre del rol es obligatorio.';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    const payload = {
      ...this.nuevoRol,
      permissions: Array.from(this.permisosSeleccionadosNuevo)
    };

    this.roleService.createRole(payload).subscribe({
      next: () => {
        this.formExito = 'Rol creado correctamente.';
        this.cargarRoles();
        setTimeout(() => this.volverALista(), 1500);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Error al crear rol.';
        this.isSaving = false;
      }
    });
  }

  actualizarRol(): void {
    if (!this.rolAEditar) return;
    
    this.isSaving = true;
    this.formError = '';

    const payload = {
      name: this.rolAEditar.name,
      description: this.rolAEditar.description,
      color: this.rolAEditar.color,
      permissions: Array.from(this.permisosSeleccionadosEditar)
    };

    this.roleService.updateRole(this.rolAEditar.id, payload).subscribe({
      next: () => {
        this.formExito = 'Rol actualizado correctamente.';
        this.cargarRoles();
        setTimeout(() => this.volverALista(), 1500);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Error al actualizar.';
        this.isSaving = false;
      }
    });
  }

  // ==========================================
  // ELIMINACIÓN (CON BLOQUEO)
  // ==========================================

  abrirModalEliminarRol(rol: Role): void {
    this.rolAEliminar = rol;
    this.isDeleting = false;
    this.modalEliminarRolAbierto = true;
  }

  cerrarModalEliminarRol(): void {
    this.modalEliminarRolAbierto = false;
    this.rolAEliminar = null;
    this.isDeleting = false;
  }

  confirmarEliminarRol(): void {
    if (!this.rolAEliminar) return;
    
    // BLOQUEO INSTANTÁNEO
    this.isDeleting = true;

    this.roleService.deleteRole(this.rolAEliminar.id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.cerrarModalEliminarRol();
        this.cargarRoles();
      },
      error: (err) => {
        console.error('Error eliminar:', err);
        this.isDeleting = false;
        alert('No se pudo eliminar el rol.');
      }
    });
  }

  // ==========================================
  // PERMISOS (LÓGICA)
  // ==========================================

  togglePermiso(permisoId: number, context: 'new' | 'edit'): void {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    set.has(permisoId) ? set.delete(permisoId) : set.add(permisoId);
    this.actualizarEstadoTodos(context);
  }

  isPermisoSeleccionado(permisoId: number, context: 'new' | 'edit'): boolean {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    return set.has(permisoId);
  }

  toggleSeleccionarTodos(context: 'new' | 'edit'): void {
    const targetState = context === 'new' ? !this.seleccionarTodosNuevo : !this.seleccionarTodosEditar;
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;

    targetState ? this.todosLosPermisos.forEach(p => set.add(p.id)) : set.clear();

    if (context === 'new') this.seleccionarTodosNuevo = targetState;
    else this.seleccionarTodosEditar = targetState;
  }

  actualizarEstadoTodos(context: 'new' | 'edit'): void {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    const allSelected = this.todosLosPermisos.length > 0 && this.todosLosPermisos.every(p => set.has(p.id));

    if (context === 'new') this.seleccionarTodosNuevo = allSelected;
    else this.seleccionarTodosEditar = allSelected;
  }
}