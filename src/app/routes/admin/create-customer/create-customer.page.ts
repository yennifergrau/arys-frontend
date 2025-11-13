import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { Route, Router, RouterLink } from '@angular/router';
import { EmissionDetailsService } from '../services/emission-details.service';
import { MeritopService } from '../services/meritop.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { DataArysService } from '../services/data-arys.service';


@Component({
  selector: 'app-create-customer',
  templateUrl: './create-customer.page.html',
  styleUrls: ['./create-customer.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    SpinnerComponent,
    RouterLink,
    ReactiveFormsModule,
    NgxMaskDirective
    ],
    providers:[
      EmissionDetailsService,
      MeritopService,
      provideNgxMask(),
      DataArysService
    ]
})
export class CreateCustomerPage implements OnInit {

  private _emisionService = inject(EmissionDetailsService);
  private _meritopService = inject(MeritopService);
  private _arysService = inject( DataArysService )
  public showLoading : boolean = false;
  public emissionForm !: FormGroup


  constructor(
    private renderer: Renderer2,
    private nav: Router,
    private fb: FormBuilder
  ) { 
    this.showLoading = true
    this.generateForm()
    try {
      this._meritopService.getAccessToken().subscribe({
        next: async (result) => {
          if (result.status === 200) {
            this.showLoading = false
          }
        },
        error: (error) => {
          console.error('Error al generar el token', error);
          this.mostrarToast(' Error de red no se pudo generar el Token','toast-error')
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  private updateCredit () {
    const data = {
      rif : this._emisionService.data_user.rif,
      credit : 'true'
    }
    this._arysService.updatecredit(data).toPromise()
  }


  private generateForm() {
    this.emissionForm = this.fb.group({
      ip: new FormControl('127.0.0.1'),
      clientId: this.fb.group({
        doctype: new FormControl(''),
        docid: new FormControl('')
      }),
      name: new FormControl(''),
      last_name: new FormControl(''),
      email: new FormControl(''),
      phone_number: new FormControl(''),
      account_number: new FormControl('', Validators.required),
      product_code: new FormControl('000000003'),
      segment: new FormControl('')
    });
  }

  get accountControl(): AbstractControl<string>{
    return this.emissionForm.get('account_number')!
  }




  ngOnInit() {
    if (this._emisionService?.data_user) {
      this.emissionForm.patchValue({
        clientId: {
          doctype: this._emisionService.data_user?.prefix || '',
          docid: +this._emisionService.data_user.rif
        },
        name: this._emisionService.data_user?.name || '',
        last_name: this._emisionService.data_user?.sub_ape || '',
        email: this._emisionService.data_user?.email || '',
        phone_number: this._emisionService.data_user.phone?.replace(/[^0-9]/g, '') || '',
        account_number: '',
        segment : '1'
        // segment: (this._emisionService.planDetails?.[0]?.id || '').toString()
      });
    }
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer');
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
    }, 5000);
  }

  public async onSubmit(){
    this.showLoading = true;
    try{
      if(this.emissionForm.valid){
        console.log(this.emissionForm.value);
        const data = this.emissionForm.value
         this._meritopService.createCustomer(data).subscribe({
          next:(result) => {
            this.updateCredit()
            console.log(result);
            this._emisionService.lineaCustomer = result
            this.mostrarToast('¡Línea activada con éxito!','toast-success')
            if(result){
              this.nav.navigate(['/admin/dashboard/sarys'])
            }
          },error : async(e:HttpErrorResponse) => {
            this.showLoading = false
             await this.mostrarToast(`El prefijo del banco no es válido`,'toast-error')
          }
         })
      }else{
        this.emissionForm.markAllAsTouched();
        this.showLoading = false,
        this.mostrarToast('  ¡El número de cuenta es obligatorio!','toast-error')
      }
    }catch(e){
      this.showLoading = false
console.error(e);

    }
  }

}
