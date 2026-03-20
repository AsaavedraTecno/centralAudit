import { Routes } from '@angular/router';

// GUARDS
import { AuthGuard } from './core/guards/auth.guard';
import { LoginGuard } from './core/guards/login.guard';
import { CentralOnlyGuard } from './core/guards/central-only.guard';

// Componentes
import { LoginComponent } from './features/auth/login/login.component';
import { CrearClientesComponent } from './features/central_audit/gestion-clientes/crear-clientes/crear-clientes.component';
import { SucursalesComponent } from './features/central_audit/gestion-clientes/sucursales/sucursales.component';
import { ImpresoresComponent } from './features/central_audit/impresoras/impresoras.component';

// Componentes de Administración
import { AdminUsuariosComponent } from './features/central_audit/admin/admin-usuarios/admin-usuarios.component';
import { AdminRolesComponent } from './features/central_audit/admin/admin-roles/admin-roles';
import { AdminLayoutComponent } from './features/central_audit/admin/admin-layout/admin-layout.component';


// Componentes de Monitoreo
import { PanelComponent } from './shared/monitoreo/panel/panel.component';
import { DashboardComponent } from './shared/monitoreo/dashboard/dashboard.component';
import { VistaAdminComponent } from './shared/monitoreo/vistas-personalizadas/vista-admin/vista-admin.component';
import { MonitoreoLayoutComponent } from './shared/monitoreo/monitoreo-layout/monitoreo-layout.component';

// Componentes de Prediccion
import { PrediccionComponent } from './features/central_audit/prediccion/prediccion.component';
import { PrediccionDetalleComponent } from './features/central_audit/prediccion/components/prediccion-detalle/prediccion-detalle.component';

// Componentes de Clientes
import { layoutComponent } from './layouts/layout/layout.component';
import { ClientesLayoutComponent } from './features/central_audit/gestion-clientes/clientes-layout/clientes-layout.component';
import { EditarClientesComponent } from './features/central_audit/gestion-clientes/editar-clientes/editar-clientes.component';
import { ListarClientesComponent } from './features/central_audit/gestion-clientes/listar-clientes/listar-clientes.component';
import { RegisterComponent } from './features/auth/register/register.component';

import { ConfigurarAgenteComponent } from './features/central_audit/gestion-clientes/gestion-agentes/configurar-agente.component';
import { ListarAgentesComponent } from './features/central_audit/gestion-clientes/gestion-agentes/listar-agentes/listar-agentes.component';

// Componentes Tenant
import { HomeTenantComponent } from './features/central_tenants/home-tenant/home-tenant.component';


export const routes: Routes = [
  // 1. RUTA LOGIN
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginGuard]
  },
  { path: 'register', component: RegisterComponent }, 

  {
    path: '',
    component: layoutComponent,
    canActivate: [AuthGuard],
    children: [

      {
        path: 'monitoreo',
        component: MonitoreoLayoutComponent,
        children: [

          {path:'panel', component: PanelComponent},
          {path: 'dashboard', component: DashboardComponent},
          {
            path: 'vistas', 
            component: VistaAdminComponent,
            canActivate: [CentralOnlyGuard] 
          },
          {path:'prediccion', component: PrediccionComponent},
          { path: 'prediccion/sucursal/:tenantCode/:locationId', component: PrediccionComponent },
          { path: 'prediccion/impresora/:tenantCode/:locationId/:printerId', component: PrediccionComponent },
          { path: 'prediccion/impresora/:tenantCode/:locationId/:printerId', component: PrediccionDetalleComponent },
          {path: '', redirectTo: 'panel', pathMatch: 'full'}
        ]
      },
      {
        path: 'administracion', 
        component: AdminLayoutComponent, 
        canActivate:[AuthGuard], 
        children: [
          {path: 'usuarios', component: AdminUsuariosComponent},
          {path: 'roles', component: AdminRolesComponent},
          {path: '', redirectTo: 'usuarios', pathMatch: 'full'}
        ]
      },

      {
        path: 'gestion-clientes', 
        component: ClientesLayoutComponent,
        canActivate:[AuthGuard],
        children: [
          
          {path: 'listar-clientes', component: ListarClientesComponent},
          {path: 'crear-cliente', component: CrearClientesComponent},
          {path: ':code/editar-cliente', component: EditarClientesComponent},
          {path: ':code/sucursales', component: SucursalesComponent},

          { path: ':code/agentes', component: ListarAgentesComponent },
          { path: ':code/agentes/:id/config', component: ConfigurarAgenteComponent },
          {path: '', redirectTo: 'listar-clientes', pathMatch: 'full'},  
        
        ]

      },
      {path: 'impresoras', component: ImpresoresComponent},
      {path:'', redirectTo: 'monitoreo', pathMatch: 'full'},
    ]

    
  },

  // 3. MUNDO CLIENTE
  {
    path: 'view',
    component: layoutComponent, 
    canActivate: [AuthGuard],
    children: [
      {
        path: 'monitoreo',
        component: MonitoreoLayoutComponent,
        children: [
          { path: 'panel', component: HomeTenantComponent }, 
          { path: 'dashboard', component: DashboardComponent },
          { path: '', redirectTo: 'panel', pathMatch: 'full' }
        ]
      },
      { path: '', redirectTo: 'monitoreo', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'login', pathMatch: 'full' } 
];