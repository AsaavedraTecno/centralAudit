import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Definimos la estructura (Tipo)
export interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<Toast | null>(null);
  
  // Exponemos el observable
  toast$: Observable<Toast | null> = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    // ✅ CORRECTO: Pasamos un objeto literal que CUMPLE con la interfaz Toast
    this.toastSubject.next({ message, type });
    
    // Auto-ocultar
    setTimeout(() => {
      this.toastSubject.next(null);
    }, 3000);
  }
}