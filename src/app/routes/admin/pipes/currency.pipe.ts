import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatCurrency',
})
export class FormatCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    if (!value) return '';

    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedInteger},${decimalPart}`;
  }
}
