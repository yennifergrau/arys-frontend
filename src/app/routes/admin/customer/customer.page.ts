import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { RouterLink } from '@angular/router';
import { customer, data_customer } from '../interface/meritop.interface';
import { JsonLoaderService } from '../services/json-loader.service';
import { MeritopService } from '../services/meritop.service';
import { HttpClientModule } from '@angular/common/http';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';
import { EmissionDetailsService } from '../services/emission-details.service';
import { resolveMeritopClientIdentity } from '../utils/meritop-identity.util';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.page.html',
  styleUrls: ['./customer.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
     FormsModule,
     TabComponent,
     RouterLink,
     HttpClientModule,
     FormatCurrencyPipe
    ],
    providers:[MeritopService,JsonLoaderService]
})
export class CustomerPage implements OnInit {
  public isHidden: boolean = true;
  public customer_data: data_customer[] = [];
  public showLoading: boolean = false;
  private _emisionService = inject( EmissionDetailsService )
  private tokenStore = inject(TokenStoreService)
  public firstName!: string | any;
  public amountTotal!: string | number;
  public membershipName!: string | any;
  public limit !: string
  public pay_before !: string
  public data_customer !: any
  public data !: any

  constructor(
    private changeDetector: ChangeDetectorRef,
    private meritopService: MeritopService
  ) {
    // this.meritopService.getAccessToken().subscribe({
    //   next: async (result) => {
    //     if (result.status === 200) {
          
    //      await this.loadCustomer();
    //      await this.dataCustomer()
    //   }},
    //   error: (error) => {
    //     console.error('Error al generar el token', error);
    //   },
    // });
  //  this.data =  this._emisionService.paymentData 
  }

  toggleVisibility(event: Event) {
    event.stopPropagation();
    this.isHidden = !this.isHidden;
  }


  private dataCustomer () {
    try{
      const data = {
        ip: "10.1.1.1",
        bankid: 1,
        clientid:{
          doctype: this._emisionService.data_user.prefix || '',
          docid: +this._emisionService.data_user.rif || ''
        },
        cardnumber:this._emisionService.CardNumber
      }

      // this.meritopService.transactionCustomer(data).subscribe({
      //   next: (result) => {
 
      //     this.data_customer = result.transactions
      //     console.log(this.data_customer);
          
      //   },error: (e) => {
      //     console.error(e);
      //   }
      // })
    }catch(e) {
      console.error(e);
    }
  }

  private async loadCustomer() {
    try {
      const identity = resolveMeritopClientIdentity({
        accessToken: this.tokenStore.getAccessTokenSync(),
      });
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
          this.customer_data = result;
          console.log(result);
          
          if (this.customer_data) {
            this.showLoading = false;
            this.firstName =
            result.basicdata.firstname + ' ' + result.basicdata.lastname;
            this.membershipName = result.products[0].name;
            this.amountTotal = result.products[0].available;
            this.limit = result.products[0].limit
            this.pay_before = result.products[0].credit_pay_before
            this._emisionService.CardNumber = result.products[0].cardnumber
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
    this.data_customer = [];
  }
}
