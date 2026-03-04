import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';

@Directive({
  selector: '[appAutoResize]',
  standalone: true 
})
export class AutoResizeDirective implements OnInit {

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // Ajustar el tamaño inicial por si ya viene con texto de la base de datos
    setTimeout(() => this.resize());
  }

  // Escuchar cada vez que el usuario escribe o borra algo
  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    const textarea = this.elementRef.nativeElement as HTMLTextAreaElement;
    
    // 1. Resetear la altura temporalmente
    textarea.style.height = 'auto';
    
    // 2. Asignar la nueva altura basada en el contenido real (scrollHeight)
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}