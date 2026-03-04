import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
// 1. IMPORTANTE: Importar el Router
import { Router, RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-listar-clientes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './listar-clientes.html',
  styleUrls: ['./listar-clientes.scss']
})
export class ListarClientesComponent implements OnInit {
  
  clientes: Cliente[] = [];
  loading = false;

  // 2. IMPORTANTE: Inyectar el Router en el constructor
  constructor(
    private clienteService: ClienteService, 
    private router: Router 
  ) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.loading = true;
    this.clienteService.getClientes(1, 100).subscribe({
      next: (res) => { 
        this.clientes = res.clients || res.data || []; 
        this.loading = false; 
      },
      error: () => this.loading = false
    });
  }

  getStatusBadge(s: string): string {
    const badges: any = { 
      active: 'badge bg-success', 
      suspended: 'badge bg-warning text-dark' 
    };
    return badges[s] || 'badge bg-secondary';
  }

  crearCliente(): void {
    this.router.navigate(['/gestion-clientes/crear-cliente']);
  }

  editarCliente(code: string): void {
    this.router.navigate(['/gestion-clientes', code, 'editar-cliente']);
  }

  crearSucursal(code: string): void {
    this.router.navigate(['/gestion-clientes', code, 'sucursales']);
  }

  configurarAgente(cliente: any) {
    // 1. Intentamos obtener el ID del agente. 
    // Dependiendo de cómo lo devuelva tu Laravel, podría ser 'agent_id', 'main_agent_id' 
    // o estar dentro de un array 'agent_keys'.
    
    let agentId = cliente.agent_id;

    // Fallback: Si viene como relación (ej: cliente.agent_keys = [{id: 27, ...}])
    if (!agentId && cliente.agent_keys && cliente.agent_keys.length > 0) {
      agentId = cliente.agent_keys[0].id;
    }

    if (agentId) {
      // Navegamos a la ruta que creamos: /gestion-clientes/:code/agentes/:id/config
      this.router.navigate(['/gestion-clientes', cliente.code, 'agentes', agentId, 'config']);
    } else {
      // Si no hay agente, podrías redirigir a "Crear Llave" o mostrar un error
      alert('Este cliente no tiene un agente asignado o activo.');
      // Opcional: this.router.navigate(['/gestion-clientes', cliente.code, 'agent-keys']);
    }
  }

  eliminarCliente(cliente: Cliente): void {
    if (confirm(`¿Está seguro de eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) {
      this.clienteService.deleteCliente(cliente.code).subscribe({
        next: () => {
          this.loadClientes();
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('No se pudo eliminar el cliente.');
        }
      });
    }
  }
}