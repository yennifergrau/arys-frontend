import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MeritopService } from '../services/meritop.service';
import { resolveMeritopClientIdentity } from '../utils/meritop-identity.util';
import { JsonLoaderService } from '../services/json-loader.service';
import { HttpClientModule } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { listBank } from '../interface/meritop.interface';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { catchError, of, timeout } from 'rxjs';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-add-payment',
  templateUrl: './add-payment.page.html',
  styleUrls: ['./add-payment.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    HttpClientModule,
    SpinnerComponent,
    NgxMaskDirective,
  ],
  providers: [JsonLoaderService, MeritopService, provideNgxMask()],
})
export class AddPaymentPage implements AfterViewInit {
  public showLoading: boolean = false;
  private json_bank: listBank[] | any;
  // public data_bank!: string | any;
  public amountError: boolean = false;
  public data_bank = [
  { accountPrefix: '0102', name: 'Banco de Venezuela' },
  { accountPrefix: '0105', name: 'Mercantil Banco' },
  { accountPrefix: '0108', name: 'Provincial' },
  { accountPrefix: '0134', name: 'Banesco' },
  { accountPrefix: '0172', name: 'Bancamiga' },
  { accountPrefix: '0174', name: 'Banplus' },
  { accountPrefix: '0175', name: 'Banco Bicentenario' },
  { accountPrefix: '0191', name: 'BNC (Banco Nacional de Crédito)' }
];
  public selectedBankCode: string = 'Banco';
  public selectedBankName: string = '';
  public selectedPaymentOption: number = 1;
  public customAmount: number | null = null;
  private _emisionService = inject(EmissionDetailsService)
  public paymentForm = new FormGroup({
    amount: new FormControl(0, [Validators.required]),
    bank: new FormControl('', [Validators.required]),
    phone_provider: new FormControl('0412', [Validators.required]),
    phone: new FormControl(null, [Validators.required]),
    date: new FormControl(this.fechaActual),
  });

  public pay_before !: string
  public datapayment : any
  public amount_use !: string

  get bankControl(): AbstractControl <any>{
    return this.paymentForm.get('bank')!
  }

  get phoneControl(): AbstractControl<any>{
    return this.paymentForm.get('phone')!
  }

  constructor(
    private meritopService: MeritopService,
    private jsonPath: JsonLoaderService,
    private changeDetector: ChangeDetectorRef,
    private renderer: Renderer2,
    private router: Router
  ) {
    // this.meritopService.getAccessToken().subscribe({
    //   next: async (result) => {
    //     if (result.status === 200) {
          
    //      await this.loadCustomer();
         
    //   }},
    //   error: (error) => {
    //     console.error('Error al generar el token', error);
    //   },
    // });
   
  }

  ngAfterViewInit(): void {
    this.showLoading = false;
    // this.jsonPath.getListBank().subscribe({
    //   next: async (data) => {
    //     this.json_bank = data;
    //     if (this.json_bank) {
    //       this.showLoading = false;
    //       await this.getBankList();
    //     }
    //     this.changeDetector.detectChanges();
    //   },
    //   error: (err) => {
    //     console.error(err);
    //   },
    // });
  }


  
  private async loadCustomer() {
 
    try {
      const identity = resolveMeritopClientIdentity();
      if (!identity) return;
      const data = {
        bank: "94932663-923d-48a3-b13a-6b0bea8f3608",
        "channel": "eea602fb-749e-460a-9805-9f993fc0036a",
        "terminal": "0",
        "ip": "127.0.0.1",
        "clientid": identity,
      }
      this.meritopService.customerProduct(data).subscribe({
        next: (result: any) => {

          this.pay_before = result.products[0].credit_pay_before
          this.datapayment = result.products[0].receiving_account
          this.amount_use = result.products[0].amount_used
        },
        error: (error) => {
          console.error('Error al obtener los clientes' + error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }


  updateBankName() {
    const bank = this.data_bank.find(
      (b: any) => b.accountPrefix === this.paymentForm.get('bank')!.value
    );
    this.selectedBankName = bank ? bank.name : '';
  }

  onRadioChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.selectedPaymentOption = +inputElement.value;
    this.amountError = false;
  }

  private getBankList(): void {
    try {
      this.meritopService.listBankOption(this.json_bank).subscribe({
        next: (result) => {
          this.data_bank = result.banks;
        },
        error: (error) => {
          console.error('Error al cargar los bancos' + error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  get fechaActual() {
    return new Date().toISOString().split('T')[0];
  }

getFechaActualISO(): string {
  return new Date().toISOString();
}


  // onSubmit() {
  //   this.showLoading = false;
  //   try {
  //     if (this.paymentForm.valid) {
  //       switch (this.selectedPaymentOption) {
  //         case 1:
  //           this.paymentForm.patchValue({ amount: 10 });
  //           break;
  //         case 2:
  //           this.paymentForm.patchValue({ amount: 5 });
  //           break;
  //         case 3:
  //           console.log(this.customAmount)
  //           this.paymentForm.patchValue({ amount: this.customAmount });
  //           break;
  //       }
  //       const amount = this.paymentForm.get('amount')?.value
  //       if ( !amount || amount < 0 ){
  //         this.paymentForm.markAllAsTouched();
  //         this.showLoading = false;
  //         this.mostrarToast('El monto a cancelar debe ser mayor que el monto minimo', 'toast-error');
  //       }
  //       const data = {
  //         ip: "10.1.1.1",
  //         channel: "APP",
  //         client: {
  //           doctype: this._emisionService.data_user.prefix || '',
  //           docid: +this._emisionService.data_user.rif || '',
  //         },
  //         cardnumber: this._emisionService.CardNumber,
  //         amount: this.paymentForm.get('amount')?.value,
  //         payphone: this.paymentForm.get('phone_provider')?.value + '' + this.paymentForm.get('phone')?.value,
  //         paidon: this.getFechaActualISO(),
  //         bankcode: this.paymentForm.get('bank')?.value,
  //         concept: "pago",
  //       };
  
  //       localStorage.setItem('data-payment', JSON.stringify(data));
  //       // this.router.navigate(['/admin/report/credit/payment']);
  //       // this.meritopService.addPayment(data)
  //       // .subscribe({
  //       //   next: (result) => {
  //       //     if (result) {
  //       //       console.log('Pago exitoso:', result);
  //       //       this.mostrarToast('Pago realizado con éxito', 'toast-success');
  //       //       setTimeout(() => {
  //       //         this.router.navigate(['/admin/report/credit/payment']);
  //       //       }, 2000);
  //       //     }
  //       //   },
  //       //   error: (error) => {
  //       //     console.log('Error en el pago:', error);
  //       //     this.mostrarToast('El pago no pudo ser verificado', 'toast-error');
  //       //     this.showLoading = false;
  //       //   }
  //       // });
  //     } else {
  //       this.paymentForm.markAllAsTouched();
  //       this.showLoading = false;
  //       this.mostrarToast('Debes completar los campos', 'toast-error');
  //     }
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }

  onSubmit() {
  this.amountError = false;
  this.showLoading = false;

  // 1. Validar primero que los campos básicos del formulario (banco, teléfono) estén llenos
  if (this.paymentForm.invalid) {
    this.paymentForm.markAllAsTouched();
    this.mostrarToast('Debes completar los campos de origen', 'toast-error');
    return;
  }

  // 2. Determinar y validar el monto según la opción seleccionada
  let finalAmount: number | null = 0;

  switch (this.selectedPaymentOption) {
    case 1: // Pago Total
      // Aquí podrías tomar el valor de this.amount_use si viene del servicio
      finalAmount = parseFloat(this.amount_use) || 500; 
      break;
    case 2: // Pago Mínimo
      finalAmount = 5; // O el valor que definas como mínimo
      break;
    case 3: // Pago Parcial (EL QUE TE INTERESA)
      if (this.customAmount === null || this.customAmount === undefined || this.customAmount <= 0) {
        this.mostrarToast('Para un pago parcial, el monto debe ser mayor a 0', 'toast-error');
        this.amountError = true;
        this.showLoading = false;
        return; // Detenemos la ejecución aquí
      }
      finalAmount = this.customAmount;
      break;
  }

  // 3. Actualizar el valor en el formulario reactivo
  this.paymentForm.patchValue({ amount: finalAmount });

  // 4. Preparar la data para el envío
  const data = {
    ip: "10.1.1.1",
    channel: "APP",
    client: {
      doctype: this._emisionService.data_user?.prefix || '',
      docid: +this._emisionService.data_user?.rif || '',
    },
    cardnumber: this._emisionService.CardNumber,
    amount: finalAmount,
    payphone: this.paymentForm.get('phone_provider')?.value + '' + this.paymentForm.get('phone')?.value,
    paidon: this.getFechaActualISO(),
    bankcode: this.paymentForm.get('bank')?.value,
    concept: "pago",
  };

  console.log('Datos listos para enviar:', data);
  localStorage.setItem('data-payment', JSON.stringify(data));
  
  // Aquí puedes proceder con la navegación o el servicio
  this.mostrarToast('Procesando pago...', 'toast-success');
  this.router.navigate(['/admin/report/credit/payment']);
}


  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer1');
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
    }, 6000);
  }
}
