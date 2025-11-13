import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appFormatPlaca]',
  standalone:true
})
export class FormatPlacaDirective {

  constructor(private el: ElementRef) { }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    this.el.nativeElement.value = this.formatPlaca(value);
  }

  private formatPlaca(value: string): string {
    if (!value) return value;

    value = value.replace(/[^A-Z0-9]/g, '');

    const maxLength = 9;
    value = value.slice(0, maxLength);

    const letters = value.slice(0, 4).toUpperCase();
    const numbers = value.slice(4, 8);

    return letters + (numbers ? '-' + numbers : '');
  }
}
