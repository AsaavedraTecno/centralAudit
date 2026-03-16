import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';

@Pipe({
  name: 'formatDateTime',
  standalone: true
})
@Injectable()
export class FormatDateTimePipe implements PipeTransform {
  constructor(private datePipe: DatePipe) {}

  transform(value: any, format: 'short' | 'full' = 'short'): string {
    if (!value) return '—';

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return '—';

      switch (format) {
        case 'full':
          return (
            this.datePipe.transform(
              date,
              'EEEE, dd MMMM yyyy HH:mm',
              undefined,
              'es-CL'
            ) || '—'
          );
        default:
          return (
            this.datePipe.transform(
              date,
              'dd/MM/yyyy HH:mm',
              undefined,
              'es-CL'
            ) || '—'
          );
      }
    } catch (error) {
      return '—';
    }
  }
}