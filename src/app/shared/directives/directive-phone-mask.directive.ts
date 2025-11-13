import { Directive, HostListener, ElementRef } from '@angular/core';

@Directive({
  selector: '[appDirectivePhoneMask]',
  standalone:true
})
export class DirectivePhoneMaskDirective {

  constructor(private el: ElementRef) { }

  @HostListener('input', ['$event'])
  onInput(event: KeyboardEvent): void {
    const input = this.el.nativeElement as HTMLInputElement;
    let trimmed = input.value.replace(/\D/g, '');

    if (trimmed.length >= 4) {
      let numbers = [];
      numbers.push(trimmed.substr(0, 4));
      numbers.push(trimmed.substr(4, trimmed.length - 4));

      input.value = numbers.join('-');
    }
  }
}
