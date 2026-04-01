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
  private autoHideTimeout: any = null;
  
  // Exponemos el observable
  toast$: Observable<Toast | null> = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }
    this.toastSubject.next({ message, type });
    
    this.autoHideTimeout = setTimeout(() => {
      this.toastSubject.next(null);
      this.autoHideTimeout = null;
    }, 3000);
  }
}