import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Cliente, createCliente } from '../../models/cliente';
import { ClienteService } from '../../services/cliente.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

interface AgentKey {
  id: number;
  name: string;
  key?: string; // Solo disponible al crear
  active: boolean;
  last_seen_at?: string;
  last_ip?: string;
  created_at: string;
}

@Component({
  selector: 'app-gestion-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-clientes.html',
  styleUrl: './gestion-clientes.scss'
})
export class GestionClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  loading = false;
  error = '';
  success = '';
  userRole = '';

  // Modal crear/editar
  showModal = false;
  editando = false;
  clienteForm: Partial<Cliente> = {};
  guardando = false;

  // Modal agent keys
  showKeysModal = false;
  selectedCliente: Cliente | null = null;
  agentKeys: AgentKey[] = [];
  loadingKeys = false;
  newKeyName = '';
  generatedKey: string | null = null;

  constructor(
    private clienteService: ClienteService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar permisos
    this.authService.me().subscribe({
      next: (response) => {
        this.userRole = response.user?.role || response.role || '';
        if (!this.isSuperAdmin()) {
          this.error = 'No tiene permisos para acceder a esta sección';
          return;
        }
        this.loadClientes();
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  isSuperAdmin(): boolean {
    return this.userRole === 'superadmin';
  }

  loadClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(1, 100).subscribe({
      next: (response) => {
        this.clientes = response.data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar clientes';
        this.loading = false;
      }
    });
  }

  // ==================== CRUD Cliente ====================

  abrirModalCrear(): void {
    this.editando = false;
    this.clienteForm = {
      status: 'active'
    };
    this.showModal = true;
    this.generatedKey = null;
  }

  abrirModalEditar(cliente: Cliente): void {
    this.editando = true;
    this.clienteForm = { ...cliente };
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.clienteForm = {};
    this.generatedKey = null;
  }

  guardarCliente(): void {
    if (!this.clienteForm.rut || !this.clienteForm.nombre || !this.clienteForm.code) {
      this.error = 'Complete los campos obligatorios: RUT, Nombre y Código';
      return;
    }

    this.guardando = true;
    this.error = '';

    if (this.editando) {
      this.clienteService.updateCliente(this.clienteForm.code!, this.clienteForm).subscribe({
        next: (cliente) => {
          this.success = 'Cliente actualizado correctamente';
          this.loadClientes();
          this.cerrarModal();
          this.guardando = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Error al actualizar cliente';
          this.guardando = false;
        }
      });
    } else {
      this.clienteService.createCliente(this.clienteForm).subscribe({
        next: (response: any) => {
          this.success = 'Cliente creado correctamente';
          // Mostrar la key generada
          if (response.agent_key?.key) {
            this.generatedKey = response.agent_key.key;
            // No cerrar modal para que vea la key
          } else {
            this.loadClientes();
            this.cerrarModal();
          }
          this.guardando = false;
        },
        error: (err) => {
          this.error = err.error?.error || err.error?.message || 'Error al crear cliente';
          this.guardando = false;
        }
      });
    }
  }

  copiarKey(): void {
    if (this.generatedKey) {
      navigator.clipboard.writeText(this.generatedKey);
      this.success = 'Key copiada al portapapeles';
    }
  }

  cerrarModalConKey(): void {
    this.loadClientes();
    this.cerrarModal();
  }

  eliminarCliente(cliente: Cliente): void {
    if (!confirm(`¿Está seguro de eliminar el cliente "${cliente.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.clienteService.deleteCliente(cliente.code).subscribe({
      next: () => {
        this.success = 'Cliente eliminado correctamente';
        this.loadClientes();
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al eliminar cliente';
      }
    });
  }

  // ==================== Agent Keys ====================

  abrirModalKeys(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.showKeysModal = true;
    this.newKeyName = '';
    this.loadAgentKeys();
  }

  cerrarModalKeys(): void {
    this.showKeysModal = false;
    this.selectedCliente = null;
    this.agentKeys = [];
  }

  loadAgentKeys(): void {
    if (!this.selectedCliente) return;

    this.loadingKeys = true;
    // TODO: Crear método en servicio
    fetch(`http://127.0.0.1:8000/api/clients/${this.selectedCliente.code}/agent-keys`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => {
      this.agentKeys = data.agent_keys || [];
      this.loadingKeys = false;
    })
    .catch(() => {
      this.error = 'Error al cargar keys';
      this.loadingKeys = false;
    });
  }

  generarNuevaKey(): void {
    if (!this.selectedCliente || !this.newKeyName.trim()) {
      this.error = 'Ingrese un nombre para la key';
      return;
    }

    fetch(`http://127.0.0.1:8000/api/clients/${this.selectedCliente.code}/agent-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: this.newKeyName })
    })
    .then(res => res.json())
    .then(data => {
      if (data.agent_key) {
        this.agentKeys.unshift({
          ...data.agent_key,
          active: true
        });
        this.success = `Key generada: ${data.agent_key.key}`;
        this.newKeyName = '';
      }
    })
    .catch(() => {
      this.error = 'Error al generar key';
    });
  }

  revocarKey(key: AgentKey): void {
    if (!this.selectedCliente) return;

    if (!confirm(`¿Revocar la key "${key.name}"?`)) return;

    fetch(`http://127.0.0.1:8000/api/clients/${this.selectedCliente.code}/agent-keys/${key.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(() => {
      key.active = false;
      this.success = 'Key revocada';
    })
    .catch(() => {
      this.error = 'Error al revocar key';
    });
  }

  activarKey(key: AgentKey): void {
    if (!this.selectedCliente) return;

    fetch(`http://127.0.0.1:8000/api/clients/${this.selectedCliente.code}/agent-keys/${key.id}/activate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    .then(res => res.json())
    .then(() => {
      key.active = true;
      this.success = 'Key activada';
    })
    .catch(() => {
      this.error = 'Error al activar key';
    });
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'active': return 'badge bg-success';
      case 'suspended': return 'badge bg-warning';
      case 'ended': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Activo';
      case 'suspended': return 'Suspendido';
      case 'ended': return 'Terminado';
      default: return status;
    }
  }

  limpiarMensajes(): void {
    setTimeout(() => {
      this.error = '';
      this.success = '';
    }, 5000);
  }
}
