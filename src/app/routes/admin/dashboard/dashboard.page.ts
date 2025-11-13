import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  OnChanges,
  OnInit,
  SimpleChanges,
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
import { EmissionDetailsService } from '../services/emission-details.service';

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
  providers: [MeritopService, JsonLoaderService],
})
export class DashboardPage implements OnInit {
  public isHidden: boolean = true;
  public json_customer: customer[] | any;
  public commerce_data: any;
  public customer_data: data_customer[] = [];
  public showLoading: boolean = false;

  public firstName!: string | any;
  public amountTotal!: string | number;
  public membershipName!: string | any;
  public username !: string

  constructor(
    private changeDetector: ChangeDetectorRef,
    private meritopService: MeritopService,
    private _emisionService: EmissionDetailsService,
    private router : Router
  ) {
    try {
      this.showLoading = true;
      this.meritopService.getAccessToken().subscribe({
        next: async (result) => {
          if (result.status === 200) {
            const data = {
              ip:"10.1.1.1",
              bank:"94932663-923d-48a3-b13a-6b0bea8f3608",
              channel:"eea602fb-749e-460a-9805-9f993fc0036a",
              terminal:"0",
              product_type:3
            }
            this.meritopService.listCommerce(data).subscribe({
              next: async (result:any) => {
                this.commerce_data = result.commerces;
                console.log(this.commerce_data);
                
                await this.loadCustomer();
              },
              error: (error) => {
                console.error('Error al obtener los comercios' + error);
              },
            });
            this.changeDetector.detectChanges();
          }
        },
        error: (error) => {
          console.error('Error al generar el token', error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

    public routingPage(value :any) : void {
    this._emisionService.commerceData = value
    this.router.navigate(['/admin/financiamiento/purchase/add/payment'])
  }

  toggleVisibility(event: Event) {
    event.stopPropagation();
    this.isHidden = !this.isHidden;
  }

  private async loadCustomer() {
    try {
      const data = {
        bank: "94932663-923d-48a3-b13a-6b0bea8f3608",
        "channel": "eea602fb-749e-460a-9805-9f993fc0036a",
        "terminal": "0",
        "ip": "127.0.0.1",
        "clientid": {
          doctype: this._emisionService.data_user.prefix || '',
          docid: +this._emisionService?.data_user?.rif || ''
        }
      }
      this.meritopService.customerProduct(data).subscribe({
        next: (result: any) => {
          this.customer_data = result;
          if (this.customer_data) {
            this.showLoading = false;
            this.firstName =
            result.basicdata.firstname + ' ' + result.basicdata.lastname;
            this.membershipName = result.products[0].name;
            this.amountTotal = result.products[0].available;
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

  ngOnInit() {
    const dataUser : any = sessionStorage.getItem('accessToken')
    const decodeData: any = jwtDecode(dataUser)
    this.username = decodeData?.name + ' ' + decodeData?.sub_ape
  }
}
