import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'jalaliDate',
  standalone: true,
})
export class JalaliDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, includeTime = false): string {
    if (!value) return '---';

    try {
      const date = typeof value === 'string' ? new Date(value) : value;
      if (isNaN(date.getTime())) return '---';

      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };

      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }

      return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(date);
    } catch {
      return '---';
    }
  }
}
