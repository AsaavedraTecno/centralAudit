import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AgentConfig } from '../../../../models/agent-config';
import { AgentService } from '../../../../core/services/agent.service';
import { AgentConfigFormComponent } from '../../../../shared/agent-config-form/agent-config-form.component';

@Component({
  selector: 'app-configurar-agente',
  standalone: true,
  imports: [CommonModule, AgentConfigFormComponent],
  templateUrl: './configurar-agente.html',
  styleUrls: ['./configurar-agente.scss']
})
export class ConfigurarAgenteComponent implements OnInit {
  
  // ============ ESTADO ============
  datosCargados: AgentConfig | null = null;
  loading = true;
  guardando = false;
  
  // ============ DATOS DE URL ============
  clientCode: string = '';
  agentKeyId: number = 0;

  // ============ FEEDBACK ============
  mensajeExito: string = '';
  mensajeError: string = '';
  tipoMensaje: 'success' | 'error' | '' = '';

  constructor(
    private route: ActivatedRoute,
    private agentService: AgentService,
    private location: Location
  ) {}

  ngOnInit() {
    // Obtener parámetros de la URL
    this.clientCode = this.route.snapshot.paramMap.get('code') || '';
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('keyId');
    
    if (idParam) {
      this.agentKeyId = +idParam;
      this.cargarConfiguracion();
    } else {
      this.mostrarMensaje('No se encontró el ID del agente en la URL.', 'error');
      this.loading = false;
    }
  }

  /**
   * Carga la configuración actual del agente desde el servidor
   */
  cargarConfiguracion() {
    this.loading = true;
    this.limpiarMensajes();

    this.agentService.getConfig(this.clientCode, this.agentKeyId).subscribe({
      next: (data) => {
        this.datosCargados = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando config:', err);
        this.mostrarMensaje(
          err.error?.message || 'Error al cargar la configuración actual. Intente recargar.',
          'error'
        );
        this.loading = false;
      }
    });
  }

  /**
   * Guarda los cambios de configuración
   * Recibe el evento del componente hijo AgentConfigFormComponent
   */
  guardarCambios(datosNuevos: AgentConfig) {
    this.guardando = true;
    this.limpiarMensajes();
    
    // Construir el payload con el ID del agente
    const payload: AgentConfig = {
      ...datosNuevos,
      agent_key_id: this.agentKeyId
    };

    console.log('Guardando configuración:', payload);

    this.agentService.saveConfig(this.clientCode, payload).subscribe({
      next: () => {
        this.mostrarMensaje(
          'Configuración actualizada correctamente.',
          'success'
        );
        this.guardando = false;
        
        // Recargar datos para confirmar que se guardó correctamente
        setTimeout(() => {
          this.cargarConfiguracion();
        }, 1500);
      },
      error: (err) => {
        console.error('Error guardando:', err);
        this.mostrarMensaje(
          err.error?.message || 'Error al guardar los cambios. Intente nuevamente.',
          'error'
        );
        this.guardando = false;
      }
    });
  }

  /**
   * Muestra un mensaje temporal
   */
  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error') {
    if (tipo === 'success') {
      this.mensajeExito = mensaje;
      this.mensajeError = '';
    } else {
      this.mensajeError = mensaje;
      this.mensajeExito = '';
    }
    this.tipoMensaje = tipo;

    // Auto-limpiar después de 5 segundos
    setTimeout(() => {
      this.limpiarMensajes();
    }, 5000);
  }

  /**
   * Limpia los mensajes de feedback
   */
  private limpiarMensajes() {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.tipoMensaje = '';
  }

  /**
   * Navega hacia atrás
   */
  volver() {
    this.location.back();
  }
}