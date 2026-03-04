import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service'; // Ajusta la ruta a tu servicio
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss']
})
// IMPORTANTE: Debe decir "export class ToastComponent"
export class ToastComponent implements OnInit {
  
  toast$: Observable<Toast | null>;

  constructor(private toastService: ToastService) {
    // Conectamos el componente con el stream del servicio
    this.toast$ = this.toastService.toast$;
  }

  ngOnInit(): void {}
}