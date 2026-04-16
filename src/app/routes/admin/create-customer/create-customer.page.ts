import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ActivatedRoute, Route, Router, RouterLink } from '@angular/router';
import { EmissionDetailsService } from '../services/emission-details.service';
import { MeritopService } from '../services/meritop.service';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { DataArysService } from '../services/data-arys.service';
import { jwtDecode } from 'jwt-decode';


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


  private idMember: number | null = null;

  constructor(
    private renderer: Renderer2,
    private nav: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) { 

    this.generateForm()
   
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
        doctype: new FormControl('', Validators.required),
        docid: new FormControl('', Validators.required)
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

  private getAccessToken() {
        const dataToken : any = sessionStorage.getItem('accessToken')
        const decodeToken : any = jwtDecode(dataToken)
        return decodeToken
      }



  ngOnInit() {
    const qid = this.route.snapshot.queryParamMap.get('id');
    this.idMember = qid ? Number(qid) : null;
    if (!this.idMember) {
      const s = sessionStorage.getItem('id_member');
      this.idMember = s ? Number(s) : null;
    }

    this.showLoading = true
    const token = this.getAccessToken()
    console.log(token)
    this.emissionForm.patchValue({
      clientId: {
        doctype: token?.prefix || '',
        docid: token?.rif || ''
      },
      name: token?.name || '',
      last_name: token?.sub_ape || '',
      email: token?.email || '',
      phone_number: token?.phone?.replace(/[^0-9]/g, '') || '',
      account_number: '',
      segment: '1'
    });
    // if (this._emisionService?.data_user) {
    //   this.emissionForm.patchValue({
    //     clientId: {
    //       doctype: this._emisionService.data_user?.letra_rif || '',
    //       docid: this._emisionService.data_user.rif
    //     },
    //     name: this._emisionService.data_user?.nombre || '',
    //     last_name: this._emisionService.data_user?.apellido || '',
    //     email: this._emisionService.data_user?.email || '',
    //     phone_number: this._emisionService.data_user.phone?.replace(/[^0-9]/g, '') || '',
    //     account_number: '',
    //     segment : '1'
    //     // segment: (this._emisionService.planDetails?.[0]?.id || '').toString()
    //   });
    // }
    //  try {
    //   this._meritopService.getAccessToken().subscribe({
    //     next: async (result) => {
    //       if (result.status === 200) {
    //         this.showLoading = false
    //       }
    //     },
    //     error: (error) => {
    //       console.error('Error al generar el token', error);
    //       this.showLoading = false
    //       this.mostrarToast(' Error de red no se pudo generar el Token','toast-error')
    //     },
    //   });
    // } catch (e) {
    //   console.error(e);
    // }
    this.showLoading = false
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-create-custormer');
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
    try {
      if (this.emissionForm.valid) {
        const idMember = this.idMember ?? Number(sessionStorage.getItem('id_member') || 0);
        if (!idMember) {
          this.mostrarToast('No se encontró la membresía. Vuelve al panel e intenta de nuevo.', 'toast-error');
          this.showLoading = false;
          return;
        }

        const clientId = this.emissionForm.get('clientId') as FormGroup;
        const docPrefix = String(clientId.get('doctype')?.value || '').trim();
        const docIdVal = String(clientId.get('docid')?.value || '').trim();
        const fv = this.emissionForm.value;

        this._arysService
          .retry_credit_line(idMember, {
            rif: docIdVal,
            prefix: docPrefix || 'V',
            name: fv.name,
            last_name: fv.last_name,
            email: fv.email,
            phone_number: fv.phone_number,
            account_number: fv.account_number,
          })
          .subscribe({
          next: (result: any) => {
            if (result.status === true) {
              this._emisionService.creditLine    = result.credit_line;
              this._emisionService.creditLineReason = null;
              this.mostrarToast('¡Línea de crédito activada con éxito!', 'toast-success');
              setTimeout(() => {
                this.nav.navigate(['/admin/service-orders/pending']);
              }, 1500);
            } else if (result.credit_line_reason === 'missing_rif') {
              this.mostrarToast('Indica documento (tipo y número) para Meritop.', 'toast-error');
            } else if (result.credit_line_reason === 'missing_meritop_fields') {
              this.mostrarToast(String(result.message || 'Completa email, teléfono y cuenta bancaria.'), 'toast-error');
            } else {
              this.mostrarToast('No se pudo abrir la línea de crédito. Intenta más tarde.', 'toast-error');
            }
            this.showLoading = false;
          },
          error: (e: HttpErrorResponse) => {
            console.error(e);
            this.mostrarToast('Error de conexión. Intenta más tarde.', 'toast-error');
            this.showLoading = false;
          }
        });

      } else {
        this.emissionForm.markAllAsTouched();
        this.showLoading = false;
        this.mostrarToast('¡El número de cuenta es obligatorio!', 'toast-error');
      }
    } catch (e) {
      this.showLoading = false;
      console.error(e);
    }
  }

}
