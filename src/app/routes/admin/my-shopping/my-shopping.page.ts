import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { DataArysService } from '../services/data-arys.service';
import { HttpClientModule } from '@angular/common/http';
import {jwtDecode} from 'jwt-decode'
import { EmissionDetailsService } from '../services/emission-details.service';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

@Component({
  selector: 'app-my-shopping',
  templateUrl: './my-shopping.page.html',
  styleUrls: ['./my-shopping.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,TabComponent,HttpClientModule],
  providers:[DataArysService]
})
export class MyShoppingPage implements OnInit {
  private tokenStore = inject(TokenStoreService);
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

  get enProceso() {
    return this.purchases.filter((p) => (p.status || 'pendiente') === 'pendiente');
  }

  get finalizadas() {
    return this.purchases.filter((p) => p.status === 'finalizada');
  }

public irAPagar(purchase: any) {
  // Guardamos la información de la compra que se va a pagar
  this._emissionDetails.paymentData = purchase;
  
  // Redirigimos a tu vista de pago (ajusta la ruta si es necesario)
  this.router.navigate(['/admin/customer/payment/purchased']);
}

  public routing(data:string){
    this._emissionDetails.paymentData = data
    this.router.navigate(['/admin/customer/payment/purchased'])
  }

  private decodeToken() {
    const data = this.tokenStore.getAccessTokenSync() || '';
    try {
      const decodeToken: any = jwtDecode(data);
      const p = decodeToken?.prefix != null ? String(decodeToken.prefix) : '';
      const r = decodeToken?.rif != null ? String(decodeToken.rif) : '';
      this.rif = `${p}${r}`.trim();
    } catch {
      this.rif = '';
    }
  }

  private getFilteredPurchases() {
    this._dataService.get_purchased().subscribe({
      next: (result: any) => {
        const all: any[] = Array.isArray(result?.data) ? result.data : [];
        const rifNorm = String(this.rif || '')
          .replace(/\s/g, '')
          .toUpperCase();
        const filtered = all.filter((item: any) => {
          const d = String(item.document || '')
            .replace(/\s/g, '')
            .toUpperCase();
          return !rifNorm || d === rifNorm;
        });
        this.purchases = filtered.map((item: any) => ({
          commerce: item.commerce,
          document_commerce: item.document_commerce,
          amount: item.amount,
          date: item.date,
          status: item.status || 'pendiente',
          id_purchase: String(item.id ?? ''),
        }));
      },
      error: (error) => {
        this.purchases = [];
        console.error('Error al obtener compras:', error);
      },
    });
  }
}