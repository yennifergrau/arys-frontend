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
  id_user !: number
  public data_membership !: any
  name !: string 
  public showLoading : boolean = false

  constructor() {
    this.showLoading = true
    const decode : any = sessionStorage.getItem('accessToken')
    const decodeToken: any = jwtDecode(decode)
    this.id_user = decodeToken.id_user
    console.log(this.id_user);
    
    console.log(this.id_user);
    
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
      this.arys_service.get_membership(this.id_user).subscribe({
        next:(result) =>{
          console.log(result);
          
          this.data_membership = result.data
          if(this.data_membership){
            this.showLoading = false
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

  ngOnInit() {
   setTimeout(() => {
    this.getMembership()
   }, 2000);
  }

}
