import { PurchaseDataService } from './../services/purchase-data.service';
import { ChangeDetectorRef, Component, inject, OnInit, Renderer2 } from '@angular/core';
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
import { MeritopSummaryCacheService } from '../services/meritop-summary-cache.service';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';
import { resolveMeritopClientIdentity } from '../utils/meritop-identity.util';

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
export class AddPurchasePage implements OnInit {
  private purchaseService = inject(PurchaseDataService);
  private meritopCache = inject(MeritopSummaryCacheService);
  private tokenStore = inject(TokenStoreService);

  private customer_data: data_customer[] | any;
  public aumount!: FormGroup;
  public showLoading: boolean = false;
  public amountTotal!: string | number;
  public pay_before_date!: string;
  public available!: string;
  public limitPayment!: string;
  private cardNumber!: any;

  totalFinanciar: string = '';

  constructor(
    private meritopService: MeritopService,
    private renderer: Renderer2,
    private cdRef: ChangeDetectorRef,
    private router: Router,
    private fb: FormBuilder,
    private _emisionService: EmissionDetailsService
  ) {
    this.aumount = this.fb.group({
      amount: ['', Validators.required],
      value: [''],
    });

    this.aumount.get('amount')?.valueChanges.subscribe((value) => {
      const raw =
        typeof value === 'string'
          ? value.replace(/\./g, '').replace(',', '.')
          : value;

      const amount = parseFloat(raw);
      const total = isNaN(amount) ? null : amount / 2;

      this.aumount.get('value')?.setValue(total);

      this.totalFinanciar =
        total !== null ? total.toFixed(2).replace('.', ',') : '';

      this.validateAmountAgainstAvailable();
    });
  }

  ngOnInit(): void {
    this.hydrateFromCache();
    this.loadCustomer();
  }

  get amountControl(): AbstractControl<string> {
    return this.aumount.get('amount')!;
  }

  get availableAmount(): number {
    if (this.amountTotal == null || this.amountTotal === '') return 0;
    const n =
      typeof this.amountTotal === 'number'
        ? this.amountTotal
        : parseFloat(
            String(this.amountTotal).replace(/\./g, '').replace(',', '.')
          );
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  get enteredAmount(): number {
    const val = this.aumount?.get('amount')?.value;
    if (!val) return 0;
    const raw =
      typeof val === 'string' ? val.replace(/\./g, '').replace(',', '.') : val;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  get enteredFinancedAmount(): number {
    const val = this.aumount?.get('value')?.value;
    if (val == null || val === '') return 0;
    const n =
      typeof val === 'number'
        ? val
        : parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  get isExceedingAvailable(): boolean {
    const amount = this.enteredAmount;
    if (amount <= 0) return false;
    const financed = this.enteredFinancedAmount;
    return financed > this.availableAmount || this.availableAmount <= 0;
  }

  private validateAmountAgainstAvailable(): void {
    const control = this.amountControl;
    if (!control) return;

    if (this.isExceedingAvailable) {
      const currentErrors = control.errors || {};
      control.setErrors({ ...currentErrors, exceedsAvailable: true });
    } else {
      if (control.hasError('exceedsAvailable')) {
        const { exceedsAvailable, ...rest } = control.errors || {};
        control.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
  }

  private hydrateFromCache(): void {
    try {
      const cached = this.meritopCache.read();
      if (cached && cached.limit > 0) {
        this.amountTotal = cached.available;
        this.limitPayment = String(cached.limit);
        this.cardNumber = cached.cardnumber;
        this.pay_before_date = cached.credit_pay_before || '';
        this.purchaseService.cutDate = cached.credit_pay_before || '';
      }
    } catch {
      // noop
    }
  }

  public async onSubmit() {
    this.showLoading = true;
    this.validateAmountAgainstAvailable();

    if (this.availableAmount <= 0) {
      this.mostrarToast(
        'No posees saldo disponible suficiente para realizar este financiamiento.',
        'toast-error'
      );
      this.showLoading = false;
      return;
    }

    const amountToFinance = this.enteredFinancedAmount;
    if (!amountToFinance || amountToFinance <= 0) {
      this.aumount.markAllAsTouched();
      this.mostrarToast('El monto a financiar debe ser mayor a 0.', 'toast-error');
      this.showLoading = false;
      return;
    }

    if (amountToFinance > this.availableAmount) {
      this.aumount.markAllAsTouched();
      this.mostrarToast(
        `El monto a financiar (${this.formatBs(amountToFinance)} Bs) no puede ser mayor al saldo disponible (${this.formatBs(this.availableAmount)} Bs).`,
        'toast-error'
      );
      this.showLoading = false;
      return;
    }

    if (this.aumount.valid && !this.isExceedingAvailable) {
      try {
        const clientIdentity = resolveMeritopClientIdentity({
          accessToken: this.tokenStore.getAccessTokenSync(),
        });

        const dataPurchased: addPurchased = {
          ip: '10.1.1.1',
          channel: 'APP',
          client: {
            doctype:
              clientIdentity?.doctype ||
              this._emisionService.data_user?.prefix ||
              'V',
            docid:
              +(clientIdentity?.docid ||
                this._emisionService.data_user?.rif ||
                0),
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
            phonenumber: '04142298696',
            paidon: new Date().toISOString(),
          },
        };

        this.purchaseService.amountPurchase = dataPurchased.amount.toString();
        this.aumount.reset();
        this.router.navigate(['/admin/purchase/recipe']);
        this.showLoading = false;
      } catch (e) {
        console.error(e);
        this.showLoading = false;
      }
    } else {
      this.aumount.markAllAsTouched();
      this.mostrarToast(
        'Por favor verifica el monto ingresado.',
        'toast-error'
      );
      this.showLoading = false;
    }
  }

  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  getCurrentDate(): string {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private data_add_purchased() {
    const data = {
      date: this.getCurrentDate(),
      user:
        this._emisionService.data_user.name +
        ' ' +
        this._emisionService.data_user.sub_ape,
      amount: (this.aumount.get('amount')?.value).toString(),
      document:
        this._emisionService.data_user.prefix +
        '' +
        this._emisionService.data_user.rif,
      commerce: this._emisionService.commerceData.commerce_description,
      document_commerce: this._emisionService.commerceData.commerce_code,
    };
    this.meritopService.addPurchasedUser(data).toPromise();
  }

  private async loadCustomer() {
    try {
      const identity = resolveMeritopClientIdentity({
        accessToken: this.tokenStore.getAccessTokenSync(),
      });
      if (!identity) return;

      const data = {
        bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
        channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
        terminal: '0',
        ip: '127.0.0.1',
        clientid: identity,
      };

      this.meritopService.customerProduct(data).subscribe({
        next: (result: any) => {
          this.customer_data = result;
          if (this.customer_data && this.customer_data.products?.length) {
            const product = this.customer_data.products[0];
            this.pay_before_date = product.credit_pay_before;
            this.cardNumber = product.cardnumber;
            this.purchaseService.cutDate = product.credit_pay_before;
            this.amountTotal = product.available;
            this.limitPayment = product.limit;
            this.meritopCache.persistFromProduct(product);
            this.validateAmountAgainstAvailable();
          }
          this.showLoading = false;
        },
        error: (error) => {
          console.error('Error al obtener datos del cliente:', error);
          this.showLoading = false;
        },
      });
    } catch (e) {
      console.error(e);
      this.showLoading = false;
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

