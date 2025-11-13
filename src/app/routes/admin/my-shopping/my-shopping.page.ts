import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { DataArysService } from '../services/data-arys.service';
import { HttpClientModule } from '@angular/common/http';
import {jwtDecode} from 'jwt-decode'
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-my-shopping',
  templateUrl: './my-shopping.page.html',
  styleUrls: ['./my-shopping.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,TabComponent,HttpClientModule],
  providers:[DataArysService]
})
export class MyShoppingPage implements OnInit {
  activeTab: string = 'enProceso';
  rif!: string;
  purchases: any[] = [];

  constructor(
    private _dataService: DataArysService,
    private router: Router,
    private _emissionDetails: EmissionDetailsService
  ) {}

  ngOnInit() {
    this.decodeToken();
    this.getFilteredPurchases();
  }

  public routing(data:string){
    this._emissionDetails.paymentData = data
    this.router.navigate(['/admin/customer/payment/purchased'])
  }

  private decodeToken() {
    const data = sessionStorage.getItem('accessToken') || '';
    const decodeToken: any = jwtDecode(data);
    console.log('Token decodificado:', decodeToken);
    this.rif = decodeToken.prefix + decodeToken.rif; // Por ejemplo: "V28131789"
  }

  private getFilteredPurchases() {
    this._dataService.get_purchased().subscribe({
      next: (result) => {
        const allPurchases = result.data;
        this.purchases = allPurchases.filter((item: any) => item.document === this.rif);
        console.log('Compras filtradas:', this.purchases);
      },
      error: (error) => {
        console.error('Error al obtener compras:', error);
      }
    });
  }
}