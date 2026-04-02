import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CHILE_DATA } from '../../../data/chile-data';

export interface IPRange {
  id?: number;
  ip_from: string;
  ip_to: string;
  subnet_mask: string;
  active: boolean;
}

export interface AgenteCreatePayload {
  clientCode: string;
  name: string;
  location_id?: number | null;
  sucursal_nombre?: string;
  sucursal_region?: string;
  sucursal_comuna?: string;
  sucursal_direccion?: string;
  sucursal_nombre_contacto?: string;
  sucursal_email_contacto?: string;
  sucursal_telefono_contacto?: string;
  snmp_community: string;
  scan_interval: number;
  ip_ranges: IPRange[];
  ip_from: string;
  ip_to: string;
  subnet_mask: string;
}

@Component({
  selector: 'app-agente-form-inline',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './agente-form-inline.component.html',
  styleUrls: ['./agente-form-inline.component.scss']
})
export class AgenteFormInlineComponent implements OnChanges {
  @Input() clientes: any[] = [];
  @Input() locations: any[] = [];
  @Input() loading = false;
  @Input() formError = '';
  @Input() successKey: string | null = null;

  @Output() submit = new EventEmitter<AgenteCreatePayload>();
  @Output() cancel = new EventEmitter<void>();
  @Output() clienteSelected = new EventEmitter<string>();

  regionesChile = CHILE_DATA.regiones;
  comunasDisponibles: string[] = [];
  selectedClientCode = '';
  sucursalMode: 'existing' | 'new' = 'existing';
  isKeyCopied = false;

  form: FormGroup;
  editingRangeIndex: number | null = null;
  showRangeForm = false;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.buildForm();
  }

  get ipRangesArray(): FormArray {
    return this.form.get('ip_ranges') as FormArray;
  }

  get clienteSeleccionado(): boolean {
    return !!this.selectedClientCode;
  }

  get totalIPs(): number {
    let total = 0;
    this.ipRangesArray.controls.forEach(control => {
      const ipFrom = control.get('ip_from')?.value;
      const ipTo = control.get('ip_to')?.value;
      if (ipFrom && ipTo && this.esIPValida(ipFrom) && this.esIPValida(ipTo)) {
        const start = this.ipToLong(ipFrom);
        const end = this.ipToLong(ipTo);
        total += Math.abs(end - start) + 1;
      }
    });
    return total;
  }

  getTotalIPs(): number {
    return this.totalIPs;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locations'] && this.locations.length === 0 && this.sucursalMode === 'existing') {
      this.sucursalMode = 'new';
      this.updateSucursalValidators();
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      location_id: [null],
      sucursal_nombre: [''],
      sucursal_region: [''],
      sucursal_comuna: [''],
      sucursal_direccion: [''],
      sucursal_nombre_contacto: [''],
      sucursal_email_contacto: [''],
      sucursal_telefono_contacto: [''],
      snmp_community: ['public', Validators.required],
      scan_interval: [15, [Validators.required, Validators.min(1)]],
      ip_ranges: this.fb.array([]),
      ip_from: [''],
      ip_to: [''],
      subnet_mask: ['255.255.255.0'],
    });
  }

  private createRangeFormGroup(range?: Partial<IPRange>): FormGroup {
    return this.fb.group({
      id: [range?.id || null],
      ip_from: [range?.ip_from || '', [Validators.required, this.ipValidator]],
      ip_to: [range?.ip_to || '', [Validators.required, this.ipValidator]],
      subnet_mask: [range?.subnet_mask || '255.255.255.0', Validators.required],
      active: [range?.active ?? true]
    });
  }

  private ipValidator(control: any): { [key: string]: boolean } | null {
    if (!control.value) return null;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(control.value)) return { 'invalidIp': true };
    const parts = control.value.split('.');
    const isValid = parts.every((part: string) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    return isValid ? null : { 'invalidIp': true };
  }

  onClientChange(code: string): void {
    this.selectedClientCode = code;
    this.form.patchValue({ location_id: null });
    this.comunasDisponibles = [];
    this.formError = '';
    this.clienteSelected.emit(code);
    this.cdr.markForCheck();
  }

  onSucursalModeChange(mode: 'existing' | 'new'): void {
    this.sucursalMode = mode;
    this.updateSucursalValidators();
  }

  onSucursalRegionChange(): void {
    this.form.patchValue({ sucursal_comuna: '' });
    const region = this.regionesChile.find(r => r.NombreRegion === this.form.get('sucursal_region')?.value);
    this.comunasDisponibles = region ? region.comunas : [];
  }

  private updateSucursalValidators(): void {
    const isNew = this.sucursalMode === 'new';
    const fields = ['sucursal_nombre', 'sucursal_region', 'sucursal_comuna', 'sucursal_direccion'];
    fields.forEach(f => {
      const ctrl = this.form.get(f);
      if (ctrl) {
        ctrl.setValidators(isNew ? [Validators.required] : []);
        ctrl.updateValueAndValidity();
      }
    });
    const contactFields = ['sucursal_nombre_contacto', 'sucursal_email_contacto', 'sucursal_telefono_contacto'];
    contactFields.forEach(f => {
      const ctrl = this.form.get(f);
      if (ctrl) {
        if (f === 'sucursal_email_contacto') {
          ctrl.setValidators(isNew ? [Validators.required, Validators.email] : []);
        } else {
          ctrl.setValidators(isNew ? [Validators.required] : []);
        }
        ctrl.updateValueAndValidity();
      }
    });
  }

  esIPValida(ip: string): boolean {
    if (!ip) return false;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    return ip.split('.').every(p => {
      const num = parseInt(p, 10);
      return num >= 0 && num <= 255;
    });
  }

  private ipToLong(ip: string): number {
    const parts = ip.split('.');
    return (parseInt(parts[0], 10) << 24) + (parseInt(parts[1], 10) << 16) + (parseInt(parts[2], 10) << 8) + parseInt(parts[3], 10);
  }

  getRangeGroup(index: number | null): FormGroup {
    return this.ipRangesArray.at(index || 0) as FormGroup;
  }

  addRange(): void {
    if (this.editingRangeIndex !== null) {
      const current = this.ipRangesArray.at(this.editingRangeIndex);
      if (current && !current.valid) return;
    }
    this.ipRangesArray.push(this.createRangeFormGroup());
    this.editingRangeIndex = this.ipRangesArray.length - 1;
    this.showRangeForm = true;
  }

  editRange(index: number): void {
    if (this.editingRangeIndex !== null && this.editingRangeIndex !== index) {
      const current = this.ipRangesArray.at(this.editingRangeIndex);
      if (current && !current.valid) return;
    }
    this.editingRangeIndex = index;
    this.showRangeForm = true;
  }

  cancelRange(): void {
    const current = this.ipRangesArray.at(this.editingRangeIndex || 0);
    if (this.editingRangeIndex === this.ipRangesArray.length - 1 && current && !current.get('ip_from')?.value && !current.get('ip_to')?.value) {
      this.ipRangesArray.removeAt(this.editingRangeIndex);
    }
    this.editingRangeIndex = null;
    this.showRangeForm = false;
  }

  deleteRange(index: number): void {
    this.ipRangesArray.removeAt(index);
    if (this.editingRangeIndex === index) {
      this.editingRangeIndex = null;
      this.showRangeForm = false;
    }
  }

  crearAgente(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.ipRangesArray.length === 0) {
      this.formError = 'Debe agregar al menos un rango de IP.';
      return;
    }
    if (this.editingRangeIndex !== null) {
      this.formError = 'Complete el rango de IP actual antes de guardar.';
      return;
    }

    const payload: AgenteCreatePayload = {
      clientCode: this.selectedClientCode,
      name: this.form.get('name')?.value,
      snmp_community: this.form.get('snmp_community')?.value,
      scan_interval: this.form.get('scan_interval')?.value,
      ip_ranges: this.ipRangesArray.value,
      ip_from: this.ipRangesArray.at(0)?.get('ip_from')?.value || '',
      ip_to: this.ipRangesArray.at(0)?.get('ip_to')?.value || '',
      subnet_mask: this.ipRangesArray.at(0)?.get('subnet_mask')?.value || '255.255.255.0',
    };

    if (this.sucursalMode === 'existing') {
      payload.location_id = this.form.get('location_id')?.value;
    } else {
      payload.sucursal_nombre = this.form.get('sucursal_nombre')?.value;
      payload.sucursal_region = this.form.get('sucursal_region')?.value;
      payload.sucursal_comuna = this.form.get('sucursal_comuna')?.value;
      payload.sucursal_direccion = this.form.get('sucursal_direccion')?.value;
      payload.sucursal_nombre_contacto = this.form.get('sucursal_nombre_contacto')?.value;
      payload.sucursal_email_contacto = this.form.get('sucursal_email_contacto')?.value;
      payload.sucursal_telefono_contacto = this.form.get('sucursal_telefono_contacto')?.value;
    }

    this.submit.emit(payload);
  }

  cancelar(): void {
    this.cancel.emit();
  }

  reset(): void {
    this.selectedClientCode = '';
    this.form = this.buildForm();
    this.formError = '';
    this.sucursalMode = 'existing';
    this.comunasDisponibles = [];
    this.successKey = null;
    this.isKeyCopied = false;
    this.editingRangeIndex = null;
    this.showRangeForm = false;
    this.cdr.markForCheck();
  }

  copyKey(): void {
    if (!this.successKey) return;
    navigator.clipboard.writeText(this.successKey).then(() => {
      this.isKeyCopied = true;
      setTimeout(() => this.isKeyCopied = false, 2000);
    });
  }
}
