import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnChanges,
  OnInit,
  SimpleChanges,
  Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { Router, RouterLink } from '@angular/router';
import {
  commerce,
  customer,
  data_commerce,
  data_customer,
} from '../interface/meritop.interface';
import { MeritopService } from '../services/meritop.service';
import { HttpClientModule } from '@angular/common/http';
import { JsonLoaderService } from '../services/json-loader.service';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';
import { jwtDecode } from 'jwt-decode'
import { EmissionService } from '../services/emission.service';
import { NavController } from '@ionic/angular';
import { EmissionDetailsService } from '../services/emission-details.service';
import { DataArysService } from '../services/data-arys.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
    FormatCurrencyPipe,
  ],
  providers: [MeritopService, JsonLoaderService, EmissionService, DataArysService],
})
export class DashboardPage implements OnInit {

  private arys_service = inject(DataArysService)
  public isHidden: boolean = true;
  public json_customer: customer[] | any;
  private emission = inject(EmissionService);
  public commerce_data: any;
  public customer_data: data_customer[] = [];
  public showLoading: boolean = false;

  public firstName!: string | any;
  public amountTotal!: string | number;
  public membershipName!: string | any;
  public username !: string
  public data_membership: any[] | null = null;

  // Resumen Meritop para mostrar montos reales en Inicio
  private meritopSummaryState: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';
  private meritopProduct: { available: number; limit: number; cardnumber: string; credit_pay_before?: string } | null = null;

  /** Filas listas para la vista (API `get_membership` → credit_limit / credit_available). */
  get membershipList(): Array<{
    id_master: number;
    name: string;
    available_amount: number;
    credit_limit: number;
    has_credit: boolean;
    credit_pay_before?: string;
  }> {
    const d = this.data_membership;
    if (!d || !Array.isArray(d)) return [];
    return d.map((row: any) => {
      let limit = Number(row.credit_limit) || 0;
      let available = Number(row.credit_available) || 0;
      let creditPayBefore: string | undefined = row?.credit_pay_before != null ? String(row.credit_pay_before) : undefined;

      // Si Meritop respondió bien, preferimos esos montos (evita mostrar 300 “fijo” de ARYS).
      if (
        this.meritopSummaryState === 'ready' &&
        this.meritopProduct &&
        this.meritopProduct.limit > 0
      ) {
        limit = this.meritopProduct.limit;
        available = this.meritopProduct.available;
        if (this.meritopProduct.credit_pay_before) {
          creditPayBefore = this.meritopProduct.credit_pay_before;
        }
      }

      const vehicleLabel = [row.vehicle_brand, row.vehicle_model, row.vehicle_year]
        .filter(Boolean)
        .join(' ')
        .trim();
      const label = vehicleLabel || String(row.name || '').trim() || 'Membresía';
      const lineId = row.credit_line_id != null && String(row.credit_line_id).trim() !== '';
      return {
        id_master: row.id_master,
        name: label,
        available_amount: available,
        credit_limit: limit,
        has_credit: !!lineId,
        credit_pay_before: creditPayBefore,
      };
    });
  }

  public formatCreditPayBefore(value?: string): string {
    const raw = (value ?? '').toString().trim();
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  private getIdentity(): { doctype: string; docid: number } | null {
    try {
      const token = sessionStorage.getItem('accessToken');
      if (token) {
        const decoded: any = jwtDecode(token);
        const tokenDocType = String(decoded?.doctype || decoded?.prefix || '').trim();
        const tokenDocId = Number(decoded?.docid || decoded?.rif || 0);
        if (tokenDocType && tokenDocId > 0) return { doctype: tokenDocType, docid: tokenDocId };
      }
    } catch {
      // noop
    }

    try {
      const raw = localStorage.getItem('userData');
      const userData = raw ? JSON.parse(raw) : null;
      const docType = String(userData?.doctype || userData?.prefix || userData?.letra_rif || '').trim();
      const docId = Number(userData?.docid || userData?.rif || 0);
      if (docType && docId > 0) return { doctype: docType, docid: docId };
    } catch {
      // noop
    }

    return null;
  }

  private loadMeritopSummary() {
    const identity = this.getIdentity();
    if (!identity) {
      this.meritopSummaryState = 'fallback';
      this.meritopProduct = null;
      return;
    }

    this.meritopSummaryState = 'loading';
    const payload = {
      bank: '94932663-923d-48a3-b13a-6b0bea8f3608',
      channel: 'eea602fb-749e-460a-9805-9f993fc0036a',
      terminal: '0',
      ip: '127.0.0.1',
      clientid: identity
    };

    this.meritopService.getAccessToken().subscribe({
      next: () => {
        this.meritopService.customerProduct(payload).subscribe({
          next: (result: any) => {
            const product = result?.products?.[0];
            if (!product) {
              this.meritopSummaryState = 'fallback';
              this.meritopProduct = null;
              return;
            }
            const limit = Number(product.limit ?? 0) || 0;
            const available = Number(product.available ?? 0) || 0;
            this.meritopProduct = {
              limit,
              available,
              cardnumber: String(product.cardnumber ?? ''),
              credit_pay_before: product.credit_pay_before != null ? String(product.credit_pay_before) : undefined,
            };
            this.meritopSummaryState = 'ready';
          },
          error: () => {
            this.meritopSummaryState = 'fallback';
            this.meritopProduct = null;
          }
        });
      },
      error: () => {
        this.meritopSummaryState = 'fallback';
        this.meritopProduct = null;
      }
    });
  }

  constructor(
    private changeDetector: ChangeDetectorRef,
    private meritopService: MeritopService,
    private _emisionService: EmissionDetailsService,
    private router : Router,
    private renderer: Renderer2,
    private navCtrl: NavController
  ) {
    // try {
    //   this.showLoading = false;
    //   this.meritopService.getAccessToken().subscribe({
    //     next: async (result) => {
    //       if (result.status === 200) {
    //         const data = {
    //           ip:"10.1.1.1",
    //           bank:"94932663-923d-48a3-b13a-6b0bea8f3608",
    //           channel:"eea602fb-749e-460a-9805-9f993fc0036a",
    //           terminal:"0",
    //           product_type:3
    //         }
    //         this.meritopService.listCommerce(data).subscribe({
    //           next: async (result:any) => {
    //             this.commerce_data = result.commerces;
    //             console.log(this.commerce_data);
                
    //             await this.loadCustomer();
    //           },
    //           error: (error) => {
    //             console.error('Error al obtener los comercios' + error);
    //           },
    //         });
    //         this.changeDetector.detectChanges();
    //       }
    //     },
    //     error: (error) => {
    //       this.showLoading = false;
    //       console.error('Error al generar el token', error);
    //     },
    //   });
    // } catch (e) {
    //   this.showLoading = false;
    //   console.error(e);
    // }
  }

    public routingPage(value :any) : void {
    this._emisionService.commerceData = value
    this.router.navigate(['/admin/financiamiento/purchase/add/payment'])
  }

  toggleVisibility(event: Event) {
    event.stopPropagation();
    this.isHidden = !this.isHidden;
  }

  // Función para navegar a la pantalla de pago
public pagarCredito(membership: any) {
  this._emisionService.paymentData = membership; // Guardamos la info para la siguiente vista
  // Inicio: el botón Pagar debe llevar a la pantalla de pagar deuda.
  this.router.navigate(['/admin/pagar-deuda']);
}

  // private async loadCustomer() {
  //   try {
  //     const data = {
  //       bank: "94932663-923d-48a3-b13a-6b0bea8f3608",
  //       "channel": "eea602fb-749e-460a-9805-9f993fc0036a",
  //       "terminal": "0",
  //       "ip": "127.0.0.1",
  //       "clientid": {
  //         doctype: this._emisionService.data_user.prefix || '',
  //         docid: +this._emisionService?.data_user?.rif || ''
  //       }
  //     }
  //     this.meritopService.customerProduct(data).subscribe({
  //       next: (result: any) => {
  //         this.customer_data = result;
  //         if (this.customer_data) {
  //           this.showLoading = false;
  //           this.firstName =
  //           result.basicdata.firstname + ' ' + result.basicdata.lastname;
  //           this.membershipName = result.products[0].name;
  //           this.amountTotal = result.products[0].available;
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error al obtener los clientes' + error);
  //       },
  //     });
  //   } catch (e) {
  //     console.error(e);
  //   }
  // }

  private UserVerifyMembership(rif: string){
      const data = {
        cedula: rif
      }

      this.emission.userIsActive(data).subscribe({
        next: (response: any) => {
          
          // Si el usuario no tiene membresia lo enviamos a los planes para que compre una
          if (response.total === 0) {
            this.navCtrl.navigateRoot(['/admin/planes/home/user']);
            this.showLoading = false;
          } 
 
          this.showLoading = false;
    
        },
        error: (err: any) => {

          console.log(err)
          // En Inicio no bloqueamos la UX por fallas de red/servidor.
          // Si esta validación falla, el usuario igual puede ver su dashboard.
          this.showLoading = false;
        },
      });
    }


  ngOnInit() {
    this.showLoading = true;
    const dataUser : any = sessionStorage.getItem('accessToken')
    const decodeData: any = jwtDecode(dataUser)
    console.log(decodeData)
    this.username = decodeData?.name + ' ' + decodeData?.sub_ape
    this.UserVerifyMembership(decodeData.rif)

    // Cargamos Meritop en paralelo para mostrar montos reales en Inicio.
    this.loadMeritopSummary()

    const stored = sessionStorage.getItem('id_member')
    const idMember = stored
      ? Number(stored)
      : decodeData?.id_member != null
        ? Number(decodeData.id_member)
        : null
    if (idMember) {
      this.getMembershipById(idMember)
    } else if (decodeData?.email) {
      this.getMembershipByEmail(String(decodeData.email))
    } else {
      this.showLoading = false
    }
  }

  private getMembershipById(idMember: number){
    try{
      this.arys_service.get_membership(idMember).subscribe({
        next: (result) => {
          this.data_membership =
            result?.status && Array.isArray(result.data) ? result.data : [];
          this.showLoading = false;
        },
        error: (error) => {
          this.data_membership = [];
          this.showLoading = false;
          console.log(error);
        }
      })
    }catch(e){
      console.error(e);     
    }
  }

  private getMembershipByEmail(email: string) {
    try {
      this.arys_service.get_membership_by_email(email).subscribe({
        next: (result) => {
          this.data_membership =
            result?.status && Array.isArray(result.data) ? result.data : [];
          const first = this.data_membership?.[0];
          if (first?.id_master != null) {
            sessionStorage.setItem('id_member', String(first.id_master));
          }
          this.showLoading = false;
        },
        error: () => {
          this.data_membership = [];
          this.showLoading = false;
        }
      })
    } catch (e) {
      console.error(e)
      this.showLoading = false
    }
  }

  public solicitarCredito(membership: any) {
  console.log('Iniciando solicitud para:', membership.name);
  // Aquí rediriges a la pantalla de solicitud de crédito de Meritop
  this.router.navigate(['admin/Customer/create/sarys/meritop'], { 
    queryParams: { id: membership.id_master } 
  });
}

    private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-dashoard');
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
