import { PurchaseDataService } from './../services/purchase-data.service';
import { ChangeDetectorRef, Component, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { HttpClientModule } from '@angular/common/http';
import { MeritopService } from '../services/meritop.service';
import { addPurchased, data_customer } from '../interface/meritop.interface';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-add-purchase',
  templateUrl: './add-purchase.page.html',
  styleUrls: ['./add-purchase.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    NgxMaskDirective,
    HttpClientModule,
    ReactiveFormsModule,
    SpinnerComponent,
    FormatCurrencyPipe,
  ],
  providers: [MeritopService, PurchaseDataService, provideNgxMask()],
})
export class AddPurchasePage {
  private purchaseService = inject(PurchaseDataService);

  private customer_data: data_customer[] | any;
  public aumount!: FormGroup;
  public showLoading: boolean = false;
  public amountTotal!: string | number;
  public pay_before_date!: string;
  public available!: string;
  public limitPayment!: string;
  private cardNumber !: any 

  totalFinanciar: string = '';

  constructor(
    private meritopService: MeritopService,
    private renderer: Renderer2,
    private cdRef: ChangeDetectorRef,
    private router: Router,
    private fb: FormBuilder,
    private _emisionService: EmissionDetailsService
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
   
    this.aumount = this.fb.group({
      amount: ['', Validators.required],
      value: ['']
    });
    
    this.aumount.get('amount')?.valueChanges.subscribe(value => {
      const raw = typeof value === 'string'
        ? value.replace(/\./g, '').replace(',', '.')
        : value;
    
      const amount = parseFloat(raw);
      const total = isNaN(amount) ? null : amount / 2;
    
      this.aumount.get('value')?.setValue(total);
      console.log(this.aumount.get('value')?.value);
    
      // Solo si necesitas mostrarlo con coma en otro campo visual
      this.totalFinanciar = total !== null ? total.toFixed(2).replace('.', ',') : '';
    });
  }
  

  get amountControl(): AbstractControl<string> {
    return this.aumount.get('amount')!;
  }

  public async onSubmit() {
    this.showLoading = true;
    if (this.aumount.valid) {
      try {
        const dataPurchased: addPurchased = {
          ip: '10.1.1.1',
          channel: 'APP',
          client: {
          doctype: this._emisionService.data_user?.prefix || '',
          docid: +this._emisionService.data_user.rif || ''
          },
          cardnumber: this.cardNumber,
          reference: '',
          amount: this.aumount.get('value')?.value,
          concept: 'Pago Móvil',
          payment: {
            bankcode: '0171',
            doctype: 'J',
            docid: 404438521,
            account: '01710005096002556035',
            phonenumber: "04142298696",
            paidon: '2025-05-05T16:49:04.369Z',
          },
        };
       
        // await this.data_add_purchased()
        this.purchaseService.amountPurchase =
                dataPurchased.amount.toString();
        this.aumount.reset();
        this.router.navigate(['/admin/purchase/recipe']);
         
        this.showLoading = false;
        // await this.meritopService.addPurchased(dataPurchased).subscribe({
        //   next: async (result) => {
        //     if (result.code === 915) {
        //       await this.data_add_purchased()
        //       await this.mostrarToast(`${result.message}`, 'toast-success');
        //       this.aumount.reset();
        //       this.purchaseService.idPurchase = result.payid;
        //       this.purchaseService.amountPurchase =
        //         dataPurchased.amount.toString();
        //       setTimeout(() => {
        //         this.router.navigate(['/admin/purchase/recipe']);
        //       }, 4000);
        //     } else if (result.code === 915) {
        //       this.mostrarToast(result.message, 'toast-error');
        //     } else {
        //       this.mostrarToast(
        //         'Usted ha excedido el monto maximo de pago diario',
        //         'toast-error'
        //       );
        //     }
        //   },
        //   error: (error) => {
        //     console.error('Error al agregar el purchased' + error);
        //     this.mostrarToast(
        //       'Saldo del producto es insuficiente',
        //       'toast-error'
        //     );
        //     this.showLoading = false;
        //     this.aumount.reset();
        //   },
        // });
      } catch (e) {
        console.error(e);
      }
    } else {
      this.aumount.markAllAsTouched();
      this.mostrarToast('El monto es obligatorio!', 'toast-error');
      this.showLoading = false;
    }
  }

  getCurrentDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private data_add_purchased(){
    const data = {
      date: this.getCurrentDate(),
      user: this._emisionService.data_user.name + '' + this._emisionService.data_user.sub_ape,
      amount: (this.aumount.get('amount')?.value).toString(),
      document: this._emisionService.data_user.prefix + '' + this._emisionService.data_user.rif,
      commerce: this._emisionService.commerceData.commerce_description,
      document_commerce:this._emisionService.commerceData.commerce_code
    }
    this.meritopService.addPurchasedUser(data).toPromise()
  }

  private async loadCustomer() {
 
    try {
      const data = {
        bank: "94932663-923d-48a3-b13a-6b0bea8f3608",
        "channel": "eea602fb-749e-460a-9805-9f993fc0036a",
        "terminal": "0",
        "ip": "127.0.0.1",
        "clientid": {
          doctype: this._emisionService.data_user?.prefix || '',
          docid: +this._emisionService.data_user?.rif || ''
        }
      }
      this.meritopService.customerProduct(data).subscribe({
        next: (result: any) => {
          this.customer_data = result;
          console.log(result);
          
          if (this.customer_data) {
            if (this.customer_data) {
              this.pay_before_date = this.customer_data.products[0].credit_pay_before;
              this.cardNumber = this.customer_data.products[0].cardnumber
              
              this.purchaseService.cutDate =
              this.customer_data.products[0].credit_pay_before;
              this.amountTotal = this.customer_data.products[0].available;
              this.limitPayment = this.customer_data.products[0].limit;
            }
            this.showLoading = false;
          }
        },
        error: (error) => {
          console.error('Error al obtener los clientes' + error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainerP');
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
}
