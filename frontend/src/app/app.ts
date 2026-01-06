import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');
  private destroy$ = new Subject<void>();

  constructor(private inactivityService: InactivityService) {}

  ngOnInit(): void {
    // Escuchar advertencias de sesión
    this.inactivityService.sessionWarning$
      .pipe(takeUntil(this.destroy$))
      .subscribe((minutesRemaining: number) => {
        // Aquí se podría mostrar un modal de advertencia
        console.warn(`Sesión se cerrará en ${minutesRemaining} minutos por inactividad`);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
