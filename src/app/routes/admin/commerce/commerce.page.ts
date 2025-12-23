import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  providers:[MeritopService,JsonLoaderService]
})
export class CommercePage implements OnInit, AfterViewInit {

  public isHidden: boolean = true;
  private json_commerce : commerce[] | any;
  public  commerce_data : data_commerce[] = []
  public filtered_commerce_data: data_commerce[] = [];
  public showSearch : boolean = false;
  public searchQuery: string = '';
  public showLoading : boolean = false;
  public json_customer : customer[] | any;
  public customer_data : data_customer[] = []

  public mock_orders = [
  {
    order_id: "ORD-2025-001",
    commerce_description: "Repuestos El Chino",
    commerce_code: "COM-9982",
    amount: 150.00,
    status: "Pendiente",
    date: "2024-05-24",
    items: [
      { name: "Pastillas de Freno", qty: 2, price: 40 },
      { name: "Aceite 20W50", qty: 1, price: 70 }
    ],
    credit_used: "Membresía Toyota Corolla",
    cutoff_date: "2024-06-05"
  },
  {
    order_id: "ORD-2025-002",
    commerce_description: "Cauchos La Guaira",
    commerce_code: "COM-1123",
    amount: 85.50,
    status: "Pendiente",
    date: "2024-05-23",
    items: [
      { name: "Alineación y Balanceo", qty: 1, price: 85.50 }
    ],
    credit_used: "Membresía Moto Empire",
    cutoff_date: "2024-06-05"
  }
];

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


public solicitarNuevaOrdenSimulada() {
  this.showLoading = true;
  
  // Simulamos delay de red
  setTimeout(() => {
    const nuevaOrden = {
      order_id: "ORD-" + Math.floor(Math.random() * 10000),
      commerce_description: "Nueva Tienda Simulada",
      commerce_code: "COM-0000",
      amount: Math.floor(Math.random() * 500) + 100,
      status: "Pendiente",
      date: new Date().toISOString().split('T')[0],
      items: [{ name: "Servicio General", qty: 1, price: 200 }],
      credit_used: "Crédito Principal",
      cutoff_date: "2024-07-01"
    };

    this.mock_orders.unshift(nuevaOrden); // Agregamos al inicio
    this.showLoading = false;
    // Aquí podrías usar tu función mostrarToast que creamos antes
  }, 1000);
}

  addComerce (value:string)  {
    this._emissionDetails.commerceData = value
  }

  public routingPage(value :any) : void {
    this._emissionDetails.commerceData = value
    this.router.navigate(['/admin/financiamiento/purchase/add/payment'])
  }

  ngAfterViewInit(): void {
    this.showLoading = false
  
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
    this.showLoading = false
  }

}
