import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { CommonModule } from '@angular/common'; // Importar CommonModule
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTooltipModule],
  templateUrl: './login.html',
  styles: []
})
export class LoginComponent implements OnInit{
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  invalid: boolean = false;
  loading: boolean = false;
  route = inject(Router);
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private routes: ActivatedRoute, 
    private router: Router
  ) { 
    this.loading = false;
  }

  ngOnInit(): void {
    this.routes.queryParams.subscribe(params => {
			const param = params['token'];
      if(param){
        this.loginAzure(param);
      }
		});
    
  }

  login() {

    if(this.email === '' || this.email === undefined || this.email === null){
      this.errorMessage = 'El correo electrónico es obligatorio.';
      this.invalid = true;
      return;
    }

    if(this.password === '' || this.password === undefined || this.password === null){
      this.errorMessage = 'La contraseña es obligatoria.';
      this.invalid = true;
      return;
    }

    if(!this.invalid){
      let validMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.email);

      if(!validMail){
        this.errorMessage = 'El correo electrónico no es valido.';
      }else{
        this.loading = true;
        this.authService.login(this.email, this.password).pipe(
          catchError((error: any) => {
            Swal.fire(
              'Advertencia!',
              'Error de autenticación: ' + error.error.message,
              'warning'
            );
            this.loading = false;
            return of(null); // Devuelve un observable vacío para que la cadena de operadores continúe
          })
        ).subscribe((response: any) => {
          if(response){
            localStorage.setItem("token", response["token"]);
            localStorage.setItem("idUser",response["user_id"]);
            localStorage.setItem("id_user",response["id_user"]);
            localStorage.setItem("idEmpresa",response["empresa_id"]);
            localStorage.setItem("role",response["role"]);
            localStorage.setItem("permisos", JSON.stringify(response["permissions"]));
            // Aquí puedes manejar la respuesta exitosa, si es necesario
            this.router.navigate(['/dashboard']);
          }
        });
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginAzure(token: any){
    this.loading = true;
    this.authService.loginAzure({ token: token }).pipe(
      catchError((error: any) => {
        Swal.fire(
          'Advertencia!',
          'Error de autenticación: ' + error.error.error,
          'warning'
        );
        this.loading = false;
        return of(null); // Devuelve un observable vacío para que la cadena de operadores continúe
      })
    ).subscribe({
      next: (response) => {
        if(response){
          localStorage.setItem("token", response["token"]);
          localStorage.setItem("idUser",response["user_id"]);
          localStorage.setItem("id_user",response["id_user"]);
          localStorage.setItem("idEmpresa",response["empresa_id"]);
          localStorage.setItem("role",response["role"]);
          localStorage.setItem("permisos", JSON.stringify(response["permissions"]));
          // Aquí puedes manejar la respuesta exitosa, si es necesario
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        
        console.error('Error de autenticación', error);
        // Manejar errores, mostrar un mensaje al usuario, etc.
      }
    });
  }
}