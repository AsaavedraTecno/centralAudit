import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../../../models/cliente';
import { ClienteService } from '../../../../core/services/cliente.service';
// 1. IMPORTANTE: Importar el Router
import { Router } from '@angular/router'; 

@Component({
  selector: 'app-listar-clientes',
  standalone: true,
  imports: [CommonModule],
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