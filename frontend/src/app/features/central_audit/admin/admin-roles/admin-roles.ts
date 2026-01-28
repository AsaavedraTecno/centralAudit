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
  roles: Role[] = [];
  loadingRoles = false;

  permisosDisponibles: any = {};
  todosLosPermisos: any[] = []; // Lista plana de todos los permisos para "seleccionar todos"
  
  nuevoRol: { name: string, description: string , color: string} = { name: '', description: '', color: '#cccccc' };
  permisosSeleccionadosNuevo: Set<number> = new Set();
  seleccionarTodosNuevo = false;

  modalEliminarRolAbierto = false;
  rolAEliminar: Role | null = null;

  modalEditarRolAbierto = false;
  rolAEditar: any = null;
  permisosSeleccionadosEditar: Set<number> = new Set();
  seleccionarTodosEditar = false;

  // Helper para poder iterar sobre las keys de un objeto en el template
  objectKeys = Object.keys;

  constructor(
    private roleService: RoleService,
    private permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.cargarRoles();
    this.cargarPermisos();
  }

  cargarRoles(): void {
    this.loadingRoles = true;
    this.roleService.getRoles().subscribe({
      next: (response) => {
        // La respuesta es un objeto paginado, los roles están en response.roles.data
        this.roles = response?.roles?.data || [];
        this.loadingRoles = false;
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.loadingRoles = false;
      }
    });
  }

  cargarPermisos(): void {
    this.permissionService.getPermissionsList().subscribe({
      next: (response) => {
        this.permisosDisponibles = response;
        // Aplanar los permisos para facilitar la lógica de "seleccionar todos"
        this.todosLosPermisos = Object.values(response).flat();
      },
      error: (error) => console.error('Error al cargar permisos:', error)
    });
  }

  crearRol(): void {
    if (!this.nuevoRol.name) {
      alert('El nombre del rol es obligatorio.');
      return;
    }

    const payload = {
      ...this.nuevoRol,
      permissions: Array.from(this.permisosSeleccionadosNuevo)
    };

    this.roleService.createRole(payload).subscribe({
      next: () => {
        alert('Rol creado exitosamente');
        this.nuevoRol = { name: '', description: '', color: '#cccccc' };
        this.permisosSeleccionadosNuevo.clear();
        this.seleccionarTodosNuevo = false;
        this.cargarRoles();
      },
      error: (err) => {
        console.error('Error al crear rol:', err);
        alert('Error al crear rol: ' + (err.error?.message || 'Error desconocido'));
      }
    });
  }

  abrirModalEditarRol(rol: Role): void {
    this.rolAEditar = JSON.parse(JSON.stringify(rol)); // Clon profundo para no mutar el original
    this.permisosSeleccionadosEditar.clear();
    if (this.rolAEditar.permissions) {
      this.rolAEditar.permissions.forEach((p: any) => this.permisosSeleccionadosEditar.add(p.id));
    }
    this.actualizarEstadoTodos('edit');
    this.modalEditarRolAbierto = true;
  }

  cerrarModalEditarRol(): void {
    this.modalEditarRolAbierto = false;
    this.rolAEditar = null;
    this.seleccionarTodosEditar = false;
  }

  actualizarRol(): void {
    if (!this.rolAEditar) return;

    const payload = {
      name: this.rolAEditar.name,
      description: this.rolAEditar.description,
      color: this.rolAEditar.color,
      permissions: Array.from(this.permisosSeleccionadosEditar)
    };

    this.roleService.updateRole(this.rolAEditar.id, payload).subscribe({
      next: () => {
        alert('Rol actualizado exitosamente');
        this.cerrarModalEditarRol();
        this.cargarRoles();
      },
      error: (err) => {
        console.error('Error al actualizar rol:', err);
        alert('Error al actualizar rol: ' + (err.error?.message || 'Error desconocido'));
      }
    });
  }

  abrirModalEliminarRol(rol: Role): void {
    this.rolAEliminar = rol;
    this.modalEliminarRolAbierto = true;
  }

  cerrarModalEliminarRol(): void {
    this.modalEliminarRolAbierto = false;
    this.rolAEliminar = null;
  }

  confirmarEliminarRol(): void {
    if (!this.rolAEliminar) return;
    this.roleService.deleteRole(this.rolAEliminar.id).subscribe({
      next: () => {
        alert('Rol eliminado');
        this.cerrarModalEliminarRol();
        this.cargarRoles();
      },
      error: (err) => console.error('Error al eliminar rol:', err)
    });
  }

  togglePermiso(permisoId: number, context: 'new' | 'edit'): void {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    if (set.has(permisoId)) {
      set.delete(permisoId);
    } else {
      set.add(permisoId);
    }
    this.actualizarEstadoTodos(context);
  }

  isPermisoSeleccionado(permisoId: number, context: 'new' | 'edit'): boolean {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    return set.has(permisoId);
  }

  toggleSeleccionarTodos(context: 'new' | 'edit'): void {
    const targetState = context === 'new' ? !this.seleccionarTodosNuevo : !this.seleccionarTodosEditar;
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;

    if (targetState) {
      this.todosLosPermisos.forEach(p => set.add(p.id));
    } else {
      set.clear();
    }

    if (context === 'new') {
      this.seleccionarTodosNuevo = targetState;
    } else {
      this.seleccionarTodosEditar = targetState;
    }
  }

  actualizarEstadoTodos(context: 'new' | 'edit'): void {
    const set = context === 'new' ? this.permisosSeleccionadosNuevo : this.permisosSeleccionadosEditar;
    const allSelected = this.todosLosPermisos.length > 0 && this.todosLosPermisos.every(p => set.has(p.id));

    if (context === 'new') {
      this.seleccionarTodosNuevo = allSelected;
    } else {
      this.seleccionarTodosEditar = allSelected;
    }
  }
}