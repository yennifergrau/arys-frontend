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
  public purchases_mock: any[] = [
  {
    commerce: "Repuestos El Chino",
    document_commerce: "J-12345678",
    amount: "150.00",
    date: "20/05/2024",
    status: "pendiente", // Para la pestaña "En Proceso"
    id_purchase: "P-001"
  },
  {
    commerce: "Cauchos La Guaira",
    document_commerce: "J-87654321",
    amount: "2,100.75",
    date: "10/03/2024",
    status: "finalizada", // Para la pestaña "Finalizadas"
    id_purchase: "P-002"
  }
];

  constructor(
    private _dataService: DataArysService,
    private router: Router,
    private _emissionDetails: EmissionDetailsService
  ) {}

  ngOnInit() {
    // this.decodeToken();
    // this.getFilteredPurchases();
  }

  // Getters para filtrar automáticamente en la vista
get enProceso() {
  return this.purchases_mock.filter(p => p.status === 'pendiente');
}

get finalizadas() {
  return this.purchases_mock.filter(p => p.status === 'finalizada');
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