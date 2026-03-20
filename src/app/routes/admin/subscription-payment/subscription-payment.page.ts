import { NavController } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject, LOCALE_ID, OnInit, Renderer2 } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PaymentService } from '../services/payment.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { EmissionDetailsService } from '../services/emission-details.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
registerLocaleData(localeEs, 'es');

@Component({
  selector: 'app-subscription-payment',
  templateUrl: './subscription-payment.page.html',
  styleUrls: ['./subscription-payment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    DecimalPipe,
    NgxMaskDirective,
    HttpClientModule,
  ],
  providers: [PaymentService, provideNgxMask(), EmissionDetailsService,{ provide: LOCALE_ID, useValue: 'es' }],
})


export class SubscriptionPaymentPage implements OnInit {
  activatedRoute = inject(ActivatedRoute);
  renderer = inject(Renderer2);
  payment = inject(PaymentService);
  nav = inject(NavController);
  emission = inject(EmissionDetailsService);
  showSpinner: boolean = false;
  encryptedData!: string;
  banks: any[] = [];
  planDetails: any;
  data: any;
  dollarRate: number = 1;
  isPagoMovil: boolean = true;
  selectedBankPrefix: string = '';
  private countBank: string = '01740126281264340652';
  private codeBank: string = '0174';
  paymentForm = new FormGroup({
    identification: new FormControl('', Validators.required),
    bank_code: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
    account_number: new FormControl('', Validators.required),
    document_prefix: new FormControl('V', Validators.required),
  });

  get idenifyControl(): AbstractControl<any> {
    return this.paymentForm.get('identification')!;
  }
  get bank_codeControl(): AbstractControl<any> {
    return this.paymentForm.get('bank_code')!;
  }
  get phoneControl(): AbstractControl<any> {
    return this.paymentForm.get('phone')!;
  }
  get account_numberControl(): AbstractControl<any> {
    return this.paymentForm.get('account_number')!;
  }
  get document_prefixControl(): AbstractControl<any> {
    return this.paymentForm.get('document_prefix')!;
  }

  SetIsPagoMovil(isPagoMovil: any) {
    this.isPagoMovil = isPagoMovil.value === 'true';
    if (this.isPagoMovil) {
      this.paymentForm.get('phone')?.enable();
    } else {
      this.paymentForm.get('phone')?.disable();
      this.selectedBankPrefix = '';
    }
    this.paymentForm.get('account_number')?.setValue('');
  }

  onBankChange(event: any) {
    this.selectedBankPrefix = event.target.value || '';
    this.paymentForm.get('account_number')?.setValue('');
  }

  constructor() {}

  ngOnInit() {
    this.planDetails = this.emission.planDetails[0];
    this.data = this.emission.planDetails;
    this.showSpinner = true;
    forkJoin([this.payment.bankOptions(), this.payment.getTasaBank()]).subscribe({
      next: ([banks, tasaBank]: [any, any]) => {
        this.banks = banks;
        this.dollarRate = tasaBank[0]?.rate ?? tasaBank;
        console.log('Tasa del dólar obtenida:', this.dollarRate);
        this.showSpinner = false;
      },
      error: () => {
        this.showSpinner = false;
      },
    });
  }

  onSubmit() {
    if (this.isPagoMovil) {
      this.paymentForm.get('account_number')?.disable();
    } else {
      this.paymentForm.get('phone')?.disable();
    }
    if (this.paymentForm.valid) {
      const price = parseFloat(this.planDetails.priceI);
      const rate = this.dollarRate;
      const amountInVES = Number((rate * price).toFixed(2));
      const countOption = this.isPagoMovil ? 'CELE' : 'CNTA';
      const fullAccountNumber = this.isPagoMovil
        ? this.selectedBankPrefix + this.paymentForm.get('account_number')?.value
        : this.paymentForm.get('account_number')?.value;
      const paymentData = {
        creditor_account: {
          bank_code: this.codeBank,
          type: 'CNTA',
          number: this.countBank,
        },
        debitor_document_info: {
          type: this.paymentForm.get('document_prefix')?.value,
          number: this.paymentForm.get('identification')?.value?.toString(),
        },
        debitor_account: {
          bank_code: this.paymentForm.get('bank_code')?.value,
          type: countOption,
          number: this.isPagoMovil
            ? '0' + this.paymentForm.get('phone')?.value
            : fullAccountNumber,
          account_number: fullAccountNumber,
        },
        amount: {
          amt: amountInVES,
          currency: 'VES',
        },
      };
      this.showSpinner = true;
      this.payment.authToken().subscribe({
        next: (authToken) => {
          this.payment.realizarPago(paymentData).subscribe({
            next: async (response) => {
              await this.mostrarToast(
                'Código enviado con éxito',
                'toast-success'
              );
              if (this.data.length > 1) {
                this.data = [this.data[0]];
              }
              this.data.push(paymentData);
              
              this.emission.planDetails = this.data;
              this.nav.navigateForward('admin/subscription-payment-verify');
              this.showSpinner = false;
            },
            error: (error) => {
              this.showSpinner = false;
              this.mostrarToast(
                'Hubo un error al realizar el pago. Intente nuevamente.',
                'toast-error'
              );
            },
          });
        },
        error: (error) => {
          this.showSpinner = false;
          this.mostrarToast(
            'Hubo un error al verificar. Intente nuevamente.',
            'toast-error'
          );
        },
      });
    } else {
      this.paymentForm.markAllAsTouched();
      this.mostrarToast('Debes llenar los campos', 'toast-error');
      return;
    }
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-subPayment');
    if (!toastContainer) return;

    toastContainer.innerHTML = '';

    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, estilo);

    const toastContent = this.renderer.createElement('div');
    this.renderer.addClass(toastContent, 'toast-content');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'toast-icon');

    const errorIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const successIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
    if (estilo === 'toast-error') {
      this.renderer.setProperty(icon, 'innerHTML', errorIconSVG);
    } else if (estilo === 'toast-success') {
      this.renderer.setProperty(icon, 'innerHTML', successIconSVG);
    }
    const text = this.renderer.createElement('span');
    this.renderer.setProperty(text, 'innerHTML', mensaje);
    this.renderer.appendChild(toastContent, icon);
    this.renderer.appendChild(toastContent, text);
    this.renderer.appendChild(toast, toastContent);
    this.renderer.appendChild(toastContainer, toast);
    setTimeout(() => {
      this.renderer.removeChild(toastContainer, toast);
    }, 5000);
  }
  navigateBack() {
    this.nav.navigateRoot('/admin/emission');
  }
}
