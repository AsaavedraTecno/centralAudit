import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Dashboard } from './components/dashboard/dashboard';
import { GestionClientesComponent } from './components/gestion-clientes/gestion-clientes';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginGuard] // Evita acceso al login si ya está autenticado
  },
  { 
    path: 'dashboard', 
    component: Dashboard,
    canActivate: [AuthGuard] // Requiere autenticación para acceder
  },
  {
    path: 'gestion-clientes',
    component: GestionClientesComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];
