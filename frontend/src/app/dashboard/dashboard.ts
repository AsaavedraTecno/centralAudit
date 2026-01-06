import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClienteTreeComponent } from '../components/cliente-tree/cliente-tree';
import { Sucursales } from '../components/sucursales/sucursales';
import { ImpresoresComponent } from '../components/impresoras/impresoras';
import { GestionClientesComponent } from '../components/gestion-clientes/gestion-clientes';

interface Impresora {
  id: string;
  nombre: string;
  estado: 'Online' | 'Offline' | 'Warning';
  tipoTinta: 'Tóner' | 'Tinta';
  nivelTinta: number;
}

interface Sucursal {
  id: string;
  nombre: string;
  impresoras: Impresora[];
}

interface Cliente {
  id: string;
  nombre: string;
  sucursales: Sucursal[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ClienteTreeComponent, Sucursales, ImpresoresComponent, GestionClientesComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  userEmail: string = 'demo@ejemplo.com';
  userRole: string = '';
  // URL del logo proveniente de la API de imágenes
  public logoUrl: string = 'https://www.tecnodatasa.cl/wp-content/uploads/2024/07/Frame-39628.png';
  
  // Control de pestañas
  activeTab: 'clientes' | 'sucursales' | 'impresoras' | 'gestion' = 'clientes';
  
  // Estado de expansión de nodos
  expandedNodes: { [key: string]: boolean } = {};
  
  private readonly ACTIVE_TAB_STORAGE_KEY = 'dashboard_activeTab';
  
  // Datos mock para el árbol
  clientes: Cliente[] = [
    {
      id: 'cliente1',
      nombre: 'Empresa ABC S.A.',
      sucursales: [
        {
          id: 'sucursal1_1',
          nombre: 'Sucursal Centro',
          impresoras: [
            {
              id: 'imp1_1_1',
              nombre: 'HP LaserJet Pro 1102',
              estado: 'Online',
              tipoTinta: 'Tóner',
              nivelTinta: 78
            },
            {
              id: 'imp1_1_2',
              nombre: 'Canon Pixma G3110',
              estado: 'Offline',
              tipoTinta: 'Tinta',
              nivelTinta: 12
            },
            {
              id: 'imp1_1_3',
              nombre: 'Epson EcoTank L3150',
              estado: 'Online',
              tipoTinta: 'Tinta',
              nivelTinta: 95
            }
          ]
        },
        {
          id: 'sucursal1_2',
          nombre: 'Sucursal Norte',
          impresoras: [
            {
              id: 'imp1_2_1',
              nombre: 'Brother HL-L2350DW',
              estado: 'Online',
              tipoTinta: 'Tóner',
              nivelTinta: 45
            },
            {
              id: 'imp1_2_2',
              nombre: 'Samsung Xpress M2020W',
              estado: 'Warning',
              tipoTinta: 'Tóner',
              nivelTinta: 8
            }
          ]
        }
      ]
    },
    {
      id: 'cliente2',
      nombre: 'Corporación XYZ Ltda.',
      sucursales: [
        {
          id: 'sucursal2_1',
          nombre: 'Oficina Principal',
          impresoras: [
            {
              id: 'imp2_1_1',
              nombre: 'HP OfficeJet Pro 9010',
              estado: 'Online',
              tipoTinta: 'Tinta',
              nivelTinta: 67
            },
            {
              id: 'imp2_1_2',
              nombre: 'Xerox WorkCentre 3225',
              estado: 'Online',
              tipoTinta: 'Tóner',
              nivelTinta: 89
            }
          ]
        }
      ]
    }
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Restaurar la pestaña activa desde localStorage
    const savedTab = localStorage.getItem(this.ACTIVE_TAB_STORAGE_KEY) as 'clientes' | 'sucursales' | 'impresoras' | 'gestion' | null;
    if (savedTab && ['clientes', 'sucursales', 'impresoras', 'gestion'].includes(savedTab)) {
      this.activeTab = savedTab;
    }
    
    // Cargar rol del usuario
    this.authService.me().subscribe({
      next: (response) => {
        this.userRole = response.user?.role || response.role || '';
      }
    });
  }
  
  isSuperAdmin(): boolean {
    return this.userRole === 'superadmin';
  }

  logout(): void {
    this.authService.logout2();
  }

  // Método para cambiar de pestaña
  switchTab(tab: 'clientes' | 'sucursales' | 'impresoras' | 'gestion'): void {
    this.activeTab = tab;
    // Guardar la pestaña activa en localStorage
    localStorage.setItem(this.ACTIVE_TAB_STORAGE_KEY, tab);
  }
  
  // Método para expandir/colapsar nodos del árbol
  toggleNode(nodeId: string): void {
    this.expandedNodes[nodeId] = !this.expandedNodes[nodeId];
  }
  
  // Método para obtener el total de sucursales de un cliente
  getTotalSucursales(cliente: Cliente): number {
    return cliente.sucursales.length;
  }
  
  // Método para obtener el total de impresoras de una sucursal
  getTotalImpresoras(sucursal: Sucursal): number {
    return sucursal.impresoras.length;
  }
  
  // Método para obtener la clase CSS del badge según el estado
  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Online':
        return 'bg-success';
      case 'Offline':
        return 'bg-danger';
      case 'Warning':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }
  
  // Método para obtener el color del ícono según el nivel de tinta
  getTintaColor(nivel: number): string {
    if (nivel > 50) return 'text-success';
    if (nivel > 20) return 'text-warning';
    return 'text-danger';
  }
}
