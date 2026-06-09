import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { Router, RouterLink } from '@angular/router';
import { JsonLoaderService } from '../services/json-loader.service';
import { MeritopService } from '../services/meritop.service';
import { HttpClientModule } from '@angular/common/http';
import { commerce, customer, data_commerce, data_customer } from '../interface/meritop.interface';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { EmissionDetailsService } from '../services/emission-details.service';
import { jwtDecode } from 'jwt-decode';
import { ServiceOrderService } from '../services/service-order.service';
import { ServiceOrder } from '../interface/service-order.interface';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

@Component({
  selector: 'app-commerce',
  templateUrl: './commerce.page.html',
  styleUrls: ['./commerce.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TabComponent,
    RouterLink,
    HttpClientModule,
    SpinnerComponent],
  providers:[MeritopService, JsonLoaderService, ServiceOrderService]
})
export class CommercePage implements OnInit {

  private serviceOrderService = inject(ServiceOrderService);
  private tokenStore = inject(TokenStoreService);

  public isHidden: boolean = true;
  private json_commerce : commerce[] | any;
  public  commerce_data : data_commerce[] = []
  public filtered_commerce_data: data_commerce[] = [];
  public showSearch : boolean = false;
  public searchQuery: string = '';
  public showLoading : boolean = false;
  public json_customer : customer[] | any;
  public customer_data : data_customer[] = []

  /** Órdenes de servicio pendientes del usuario (API real). */
  public orders: ServiceOrder[] = [];

  constructor(
    private jsonPath: JsonLoaderService,
    private changeDetector: ChangeDetectorRef,
    private meritopService: MeritopService,
    private router: Router,
    private _emissionDetails :  EmissionDetailsService
  ) { 
  //   try{
  //     this.meritopService.getAccessToken().subscribe({
  //       next: async (result) => {
  //         if(result.status === 200){
  //           const data = {
  //             ip:"10.1.1.1",
  //             bank:"94932663-923d-48a3-b13a-6b0bea8f3608",
  //             channel:"eea602fb-749e-460a-9805-9f993fc0036a",
  //             terminal:"0",
  //             product_type:3
  //           }
  //           this.meritopService.listCommerce(data).subscribe({
  //             next: async (result:any) => {
  //               this.commerce_data = result.commerces;
  //               this.showLoading = false
  //               this.filtered_commerce_data = [...this.commerce_data];     
          
  //             }, error: (error) => {
  //               console.error(('Error al obtener los comercios' + error));
  //             }
  //           })
  //           this.changeDetector.detectChanges()
  //         }
  //       } ,error: (error) =>{
  //         console.error('Error al generar el token',error);
  //       }
  //     })
  //   }catch(e){
  //     console.error(e);
  //   }
  }


  public verDetalleOrden(order: any) {
  // Guardamos la orden seleccionada en tu servicio para que la otra página la lea
  // this._emissionDetails.currentOrder = order; 
  
  // Navegamos a la página de detalles (ajusta la ruta según tu proyecto)
  this.router.navigate(['/admin/financiamiento/purchase/add/payment']);
}


  addComerce (value:string)  {
    this._emissionDetails.commerceData = value
  }

  public routingPage(value :any) : void {
    this._emissionDetails.commerceData = value
    this.router.navigate(['/admin/financiamiento/purchase/add/payment'])
  }

  public getShowSearch() : void {
    this.showSearch = !this.showSearch;
  }

  public filterCommerce(): void {
    const query = this.searchQuery.toLowerCase().replace(/\s+/g, ''); 
    this.filtered_commerce_data = this.commerce_data.filter((commerce) => {
      const description = commerce.commerce_description.toLowerCase().replace(/\s+/g, '');
      return query.split('').every(letter => description.includes(letter));
    });
    this.changeDetector.detectChanges();
  }
  

  ngOnInit() {
    const token = this.tokenStore.getAccessTokenSync();
    let idUser = 0;
    if (token) {
      try {
        const dec: any = jwtDecode(token);
        idUser = Number(dec?.id_user || 0);
      } catch {
        idUser = 0;
      }
    }
    if (!idUser) {
      this.orders = [];
      this.showLoading = false;
      return;
    }
    this.showLoading = true;
    this.serviceOrderService.getPendingOrders(idUser).subscribe({
      next: (res) => {
        this.orders = res?.status && Array.isArray(res.data) ? res.data : [];
        this.showLoading = false;
        this.changeDetector.detectChanges();
      },
      error: () => {
        this.orders = [];
        this.showLoading = false;
        this.changeDetector.detectChanges();
      },
    });
  }

}
