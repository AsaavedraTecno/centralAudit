import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

export interface ClienteOption {
  code: string;
  nombre: string;
  rut?: string;
  razon_social?: string;
}

@Component({
  selector: 'app-cliente-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './cliente-selector.component.html',
  styleUrls: ['./cliente-selector.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ClienteSelectorComponent),
      multi: true
    }
  ]
})
export class ClienteSelectorComponent implements ControlValueAccessor {
  @Input() clientes: ClienteOption[] = [];
  @Input() placeholder = 'Buscar cliente...';
  @Input() clearable = true;
  @Input() disabled = false;
  @Input() label: string | null = null;

  @Output() clienteChange = new EventEmitter<string>();

  selectedCode: string | null = null;

  private onChange: (value: string | null) => void = () => {};
  onTouched: () => void = () => {};

  trackByCode(item: ClienteOption): string {
    return item?.code || item?.rut || item?.nombre || '';
  }

  // ControlValueAccessor
  writeValue(value: string | null): void {
    this.selectedCode = value;
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSelectChange(code: string | null): void {
    this.selectedCode = code;
    this.onChange(code);
    this.onTouched();
    this.clienteChange.emit(code ?? '');
  }
}
