import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { AgentConfig, IPRange } from '../../models/agent-config';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agent-config-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agent-config-form.html',
  styleUrl: './agent-config-form.scss',
})
export class AgentConfigFormComponent implements OnInit {
  
  @Input() initialData: Partial<AgentConfig> | null = null;
  @Input() isLoading: boolean = false;
  @Output() onSave = new EventEmitter<AgentConfig>();

  form: FormGroup;
  editingRangeIndex: number | null = null;
  showRangeForm = false;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      snmp_community: ['public', Validators.required],
      scan_interval: [15, [Validators.required, Validators.min(1)]],
      ip_ranges: this.fb.array([])
    });
  }

  ngOnInit() {
    if (this.initialData) {
      this.form.patchValue({
        snmp_community: this.initialData.snmp_community || 'public',
        scan_interval: this.initialData.scan_interval || 15,
      });

      // Cargar rangos existentes
      if (this.initialData.ip_ranges && this.initialData.ip_ranges.length > 0) {
        const rangesArray = this.form.get('ip_ranges') as FormArray;
        this.initialData.ip_ranges.forEach(range => {
          rangesArray.push(this.createRangeFormGroup(range));
        });
      } else if (this.initialData.ip_from && this.initialData.ip_to) {
        // Compatibilidad con formato antiguo
        const rangesArray = this.form.get('ip_ranges') as FormArray;
        rangesArray.push(this.createRangeFormGroup({
          ip_from: this.initialData.ip_from,
          ip_to: this.initialData.ip_to,
          subnet_mask: this.initialData.subnet_mask || '255.255.255.0',
          active: true
        }));
      }
    }
  }

  /**
   * Crea un FormGroup para un rango de IP
   */
  private createRangeFormGroup(range?: Partial<IPRange>): FormGroup {
    return this.fb.group({
      id: [range?.id || null],
      ip_from: [range?.ip_from || '', [Validators.required, this.ipValidator]],
      ip_to: [range?.ip_to || '', [Validators.required, this.ipValidator]],
      subnet_mask: [range?.subnet_mask || '255.255.255.0', Validators.required],
      active: [range?.active ?? true]
    });
  }

  /**
   * Validador personalizado para IPs
   */
  private ipValidator(control: any): { [key: string]: boolean } | null {
    if (!control.value) return null;
    
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(control.value)) {
      return { 'invalidIp': true };
    }
    
    const parts = control.value.split('.');
    const isValid = parts.every((part: string)=> {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    
    return isValid ? null : { 'invalidIp': true };
  }

  /**
   * Getter para acceder al FormArray de rangos
   */
  get ipRangesArray(): FormArray {
    return this.form.get('ip_ranges') as FormArray;
  }

  /**
   * Agregar nuevo rango de IP (validado)
   */
  addRange() {
    // Si hay un rango siendo editado, validarlo antes de abrir uno nuevo
    if (this.editingRangeIndex !== null) {
      const currentRange = this.ipRangesArray.at(this.editingRangeIndex);
      if (currentRange && !currentRange.valid) {
        alert('Por favor complete los datos del rango actual antes de agregar uno nuevo');
        return;
      }
    }

    this.ipRangesArray.push(this.createRangeFormGroup());
    this.editingRangeIndex = this.ipRangesArray.length - 1;
    this.showRangeForm = true;
  }

  /**
   * Editar rango existente
   */
  editRange(index: number) {
    // Validar el rango actual antes de cambiar
    if (this.editingRangeIndex !== null && this.editingRangeIndex !== index) {
      const currentRange = this.ipRangesArray.at(this.editingRangeIndex);
      if (currentRange && !currentRange.valid) {
        alert('Por favor complete los datos del rango actual antes de editar otro');
        return;
      }
    }

    this.editingRangeIndex = index;
    this.showRangeForm = true;
  }

  /**
   * Cancelar edición (validando)
   */
  cancelRange() {
    const currentRange = this.ipRangesArray.at(this.editingRangeIndex || 0);
    
    // Si es un rango nuevo y está vacío, eliminarlo
    if (this.editingRangeIndex === this.ipRangesArray.length - 1 && 
        currentRange && 
        !currentRange.get('ip_from')?.value && 
        !currentRange.get('ip_to')?.value) {
      this.ipRangesArray.removeAt(this.editingRangeIndex);
    }
    
    this.editingRangeIndex = null;
    this.showRangeForm = false;
  }

  /**
   * Eliminar rango
   */
  deleteRange(index: number) {
    if (confirm('¿Eliminar este rango de IP?')) {
      this.ipRangesArray.removeAt(index);
      // Si estábamos editando ese rango, cerrar el formulario
      if (this.editingRangeIndex === index) {
        this.editingRangeIndex = null;
        this.showRangeForm = false;
      }
    }
  }

  /**
   * Guardar el formulario completo
   */
  submit() {
    // Validar que haya al menos un rango
    if (this.ipRangesArray.length === 0) {
      alert('Debe agregar al menos un rango de IP');
      return;
    }

    // Validar que el rango siendo editado sea válido
    if (this.editingRangeIndex !== null) {
      const currentRange = this.ipRangesArray.at(this.editingRangeIndex);
      if (currentRange && !currentRange.valid) {
        alert('Por favor complete los datos del rango actual antes de guardar');
        return;
      }
    }

    // Validar que todos los rangos sean válidos
    let allRangesValid = true;
    this.ipRangesArray.controls.forEach((control, index) => {
      if (!control.valid) {
        allRangesValid = false;
        console.error(`Rango ${index + 1} inválido:`, control.errors);
      }
    });

    if (!allRangesValid) {
      alert('Hay rangos de IP con datos incompletos o inválidos');
      return;
    }

    if (this.form.valid) {
      const payload: AgentConfig = {
        snmp_community: this.form.get('snmp_community')?.value,
        scan_interval: this.form.get('scan_interval')?.value,
        ip_ranges: this.ipRangesArray.value,
        
        // Mantener compatibilidad: enviar también el primer rango en formato antiguo
        ip_from: this.ipRangesArray.at(0)?.get('ip_from')?.value,
        ip_to: this.ipRangesArray.at(0)?.get('ip_to')?.value,
        subnet_mask: this.ipRangesArray.at(0)?.get('subnet_mask')?.value,
      };

      this.onSave.emit(payload);
    } else {
      this.form.markAllAsTouched();
    }
  }

  /**
   * Obtener total de IPs de todos los rangos
   */
  getTotalIPs(): number {
    let total = 0;
    this.ipRangesArray.controls.forEach(control => {
      const ipFrom = control.get('ip_from')?.value;
      const ipTo = control.get('ip_to')?.value;
      
      if (ipFrom && ipTo && this.isValidIP(ipFrom) && this.isValidIP(ipTo)) {
        const start = this.ipToLong(ipFrom);
        const end = this.ipToLong(ipTo);
        total += Math.abs(end - start) + 1;
      }
    });
    return total;
  }

  /**
   * Validar si una IP es válida
   */
  private isValidIP(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Convertir IP a número (para cálculos)
   */
  private ipToLong(ip: string): number {
    const parts = ip.split('.');
    return (
      (parseInt(parts[0], 10) << 24) +
      (parseInt(parts[1], 10) << 16) +
      (parseInt(parts[2], 10) << 8) +
      parseInt(parts[3], 10)
    );
  }
}