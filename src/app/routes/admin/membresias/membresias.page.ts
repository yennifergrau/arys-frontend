import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader } from "@ionic/angular/standalone";
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { DataArysService } from '../services/data-arys.service';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-membresias',
  templateUrl: './membresias.page.html',
  styleUrls: ['./membresias.page.scss'],
  standalone: true,
  imports: [
     CommonModule,
      FormsModule ,
      RouterLink,
      TabComponent,
      HttpClientModule,
      SpinnerComponent,
    ],
    providers:[DataArysService,
      provideNgxMask()
    ]
})
export class MembresiasPage implements OnInit {

  private arys_service = inject(DataArysService)
  private membershipId: number | null = null
  private userEmail: string | null = null
  public data_membership: any[] = [];
  name !: string 
  public showLoading : boolean = false

  constructor() {
    this.showLoading = true
    const decode : any = sessionStorage.getItem('accessToken')
    const decodeToken: any = jwtDecode(decode)
    const stored = sessionStorage.getItem('id_member')
    this.membershipId = stored ? Number(stored) : (decodeToken.id_member != null ? Number(decodeToken.id_member) : null)
    this.userEmail = decodeToken.email ? String(decodeToken.email) : null
   }

   formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  
  public downloadPolicy(pdf_url: any): void {
    const urlObtenida = pdf_url
    if (urlObtenida ) {
        window.open(urlObtenida, '_blank');
    } else {
      console.error('No hay documento disponible');
    }
  }

  private getMembership(){
    try{
      const req = this.membershipId
        ? this.arys_service.get_membership(this.membershipId)
        : this.userEmail
          ? this.arys_service.get_membership_by_email(this.userEmail)
          : null
      if (!req) {
        this.showLoading = false
        return
      }
      req.subscribe({
        next: (result) => {
          this.data_membership =
            result?.status && Array.isArray(result.data) ? result.data : [];
          const first = this.data_membership[0];
          if (first?.id_master != null) {
            sessionStorage.setItem('id_member', String(first.id_master));
          }
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

  ngOnInit() {
    this.getMembership();
  }

}
