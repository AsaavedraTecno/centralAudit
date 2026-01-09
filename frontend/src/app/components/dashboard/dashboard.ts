import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClienteTreeComponent } from '../cliente-tree/cliente-tree'; 
import { Sucursales } from '../sucursales/sucursales';
import { ImpresoresComponent } from '../impresoras/impresoras';
import { GestionClientesComponent } from '../gestion-clientes/gestion-clientes';
import { AdminUsuarios } from '../admin-usuarios/admin-usuarios';

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
  standalone: true,
  imports: [CommonModule, FormsModule, ClienteTreeComponent, Sucursales, ImpresoresComponent, GestionClientesComponent, AdminUsuarios],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  userEmail: string = 'demo@ejemplo.com';
  userRole: string = '';
  userIdActual: number = 0;
  public logoUrl: string = 'https://www.tecnodatasa.cl/wp-content/uploads/2024/07/Frame-39628.png';
  
  activeTab: 'clientes' | 'sucursales' | 'impresoras' | 'gestion' | 'administracion' = 'clientes';
  activeAdminTab: 'usuarios' | 'roles' | 'audit-logs' = 'usuarios';
  expandedNodes: { [key: string]: boolean } = {};
  clientesDisponibles: any[] = [];
  
  private readonly ACTIVE_TAB_STORAGE_KEY = 'dashboard_activeTab';
  private readonly ACTIVE_ADMIN_TAB_STORAGE_KEY = 'dashboard_activeAdminTab';
  
  clientes: Cliente[] = [
    {
      id: 'cliente1',
      nombre: 'Empresa ABC S.A.',
      sucursales: [
        {
          id: 'sucursal1_1',
          nombre: 'Sucursal Centro',
          impresoras: [
            { id: 'imp1_1_1', nombre: 'HP LaserJet Pro 1102', estado: 'Online', tipoTinta: 'Tóner', nivelTinta: 78 },
            { id: 'imp1_1_2', nombre: 'Canon Pixma G3110', estado: 'Offline', tipoTinta: 'Tinta', nivelTinta: 12 },
            { id: 'imp1_1_3', nombre: 'Epson EcoTank L3150', estado: 'Online', tipoTinta: 'Tinta', nivelTinta: 95 }
          ]
        }
      ]
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const savedTab = localStorage.getItem(this.ACTIVE_TAB_STORAGE_KEY) as any;
    if (savedTab) this.activeTab = savedTab;
    const savedAdminTab = localStorage.getItem(this.ACTIVE_ADMIN_TAB_STORAGE_KEY) as any;
    if (savedAdminTab) this.activeAdminTab = savedAdminTab;
    this.authService.me().subscribe({ next: (response) => { this.userRole = response.user?.role || response.role || ''; this.userIdActual = response.user?.id || 0; this.userEmail = response.user?.email || ''; }, error: (err) => console.error('Error me():', err) });
  }
  
  isSuperAdmin(): boolean { return this.userRole === 'superadmin'; }
  isAdmin(): boolean { return this.userRole === 'admin' || this.userRole === 'superadmin'; }

  getRoleBadgeClass(role: string | undefined): string {
    const roleColors: { [key: string]: string } = {
      'admin': 'bg-primary', 'superadmin': 'bg-danger', 'tecnico': 'bg-success',
      'ventas': 'bg-warning', 'soporte': 'bg-info', 'cliente': 'bg-secondary'
    };
    return roleColors[role?.toLowerCase() || ''] || 'bg-secondary';
  }

  logout(): void { this.authService.logout2(); }

  switchTab(tab: any): void {
    this.activeTab = tab;
    localStorage.setItem(this.ACTIVE_TAB_STORAGE_KEY, tab);
  }
  
  switchAdminTab(tab: any): void {
    this.activeAdminTab = tab;
    localStorage.setItem(this.ACTIVE_ADMIN_TAB_STORAGE_KEY, tab);
  }
  
  toggleNode(nodeId: string): void { this.expandedNodes[nodeId] = !this.expandedNodes[nodeId]; }
  getTotalSucursales(cliente: Cliente): number { return cliente.sucursales.length; }
  getTotalImpresoras(sucursal: Sucursal): number { return sucursal.impresoras.length; }
  
  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Online': return 'bg-success';
      case 'Offline': return 'bg-danger';
      case 'Warning': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }
  
  getTintaColor(nivel: number): string {
    if (nivel > 50) return 'text-success';
    if (nivel > 20) return 'text-warning';
    return 'text-danger';
  }

  // end of dashboard class
}