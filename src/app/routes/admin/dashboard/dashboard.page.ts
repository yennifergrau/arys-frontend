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
  public id_user !: number

  public data_membership !: any

  public mockMemberships = [
  {
    id_membership: 101,
    name: "Membresía Carro Toyota",
    available_amount: 3500, // Ha gastado 1500
    credit_limit: 5000,
    has_credit: true
  },
  {
    id_membership: 103,
    name: "Membresía Carro Honda",
    available_amount: 5000, 
    credit_limit: 5000,
    has_credit: true
  },
  {
    id_membership: 102,
    name: "Membresía Moto Empire",
    available_amount: 0,
    credit_limit: 1000,
    has_credit: false 
  }
];

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
  this.router.navigate(['/admin/customer/payment/purchased']);
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

  private UserVerifyMembership(id_user: number){
      const data = {
        id_user: id_user
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
  
          this.mostrarToast(
            'No se pudo verificar la actividad del usuario',
            'toast-error'
          );
        },
      });
    }


  ngOnInit() {
    this.showLoading = true;
    const dataUser : any = sessionStorage.getItem('accessToken')
    const decodeData: any = jwtDecode(dataUser)
    console.log(decodeData)
    this.username = decodeData?.name + ' ' + decodeData?.sub_ape
    this.id_user = decodeData?.id_user
    this.UserVerifyMembership(decodeData.id_user)
    this.getMembership(this.id_user)
  }

  private getMembership(id_user: number){
    try{
      this.arys_service.get_membership(id_user).subscribe({
        next:(result) =>{
          console.log(result);
          
          this.data_membership = result.data
          if(this.data_membership){
            this.showLoading = false
            console.log(this.data_membership)
          }
        },error:(error)=>{
          this.showLoading = false
          console.log(error);
        }
      })
    }catch(e){
      console.error(e);     
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
