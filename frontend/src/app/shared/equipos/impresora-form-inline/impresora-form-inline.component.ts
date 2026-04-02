import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ClienteSelectorComponent } from '../cliente-selector/cliente-selector.component';

export interface ImpresoraCreatePayload {
  clientCode: string;
  sucursalId: number;
  ip: string;
  serie: string;
  modelo?: string;
  nombre?: string;
}

@Component({
  selector: 'app-impresora-form-inline',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, ClienteSelectorComponent],
  templateUrl: './impresora-form-inline.component.html',
  styleUrls: ['./impresora-form-inline.component.scss']
})
export class ImpresoraFormInlineComponent {
  @Input() clientes: any[] = [];
  @Input() sucursales: any[] = [];
  @Input() loading = false;
  @Input() formError = '';
  @Input() success = false;

  @Output() submitForm = new EventEmitter<ImpresoraCreatePayload>();
  @Output() cancel = new EventEmitter<void>();
  @Output() clienteSelected = new EventEmitter<string>();

  selectedClientCode = '';
  form: FormGroup;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.form = this.buildForm();
  }

  get clienteSeleccionado(): boolean {
    return !!this.selectedClientCode;
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      sucursal_id: [null, Validators.required],
      ip: ['', [Validators.required, this.ipValidator]],
      serie: ['', Validators.required],
      modelo: [''],
      nombre: ['']
    });
  }

  private ipValidator(control: any): { [key: string]: boolean } | null {
    if (!control.value) return null;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(control.value)) return { invalidIp: true };
    const parts = control.value.split('.');
    const isValid = parts.every((p: string) => {
      const n = parseInt(p, 10);
      return n >= 0 && n <= 255;
    });
    return isValid ? null : { invalidIp: true };
  }

  onClientChange(code: string): void {
    this.selectedClientCode = code || '';
    this.form.patchValue({ sucursal_id: null });
    this.formError = '';
    if (code) {
      this.clienteSelected.emit(code);
    }
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload: ImpresoraCreatePayload = {
      clientCode: this.selectedClientCode,
      sucursalId: this.form.get('sucursal_id')?.value,
      ip: this.form.get('ip')?.value,
      serie: this.form.get('serie')?.value,
      modelo: this.form.get('modelo')?.value || undefined,
      nombre: this.form.get('nombre')?.value || undefined,
    };
    this.submitForm.emit(payload);
  }

  cancelar(): void {
    this.cancel.emit();
  }

  reset(): void {
    this.selectedClientCode = '';
    this.form = this.buildForm();
    this.formError = '';
    this.cdr.markForCheck();
  }
}
