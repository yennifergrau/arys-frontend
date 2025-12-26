import { HttpClientModule } from '@angular/common/http';
import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { NavController } from '@ionic/angular';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { EmissionService } from '../services/emission.service';
import { EmissionDetailsService } from '../services/emission-details.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxMaskDirective,
    SpinnerComponent,
    HttpClientModule,
  ],
  providers: [provideNgxMask(), EmissionService],
})
export class AuthPage implements OnInit {
  public FormVerify!: FormGroup;
  public showSpinner: boolean = false;
  private emission = inject(EmissionService);
  private emissionDetails = inject(EmissionDetailsService);

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private navCtrl: NavController
  ) {
    this.generateForm();
  }

  private generateForm(): void {
    this.FormVerify = this.fb.group({
      rif: new FormControl('', Validators.required),
      // placa: new FormControl('', [
      //   Validators.required,
      //   Validators.pattern(/^[A-Z0-9]{3}-[A-Z0-9]{3,4}$/),
      // ]),
      prefix: new FormControl('V', Validators.required),
    });
  }

  get cedulaControl(): AbstractControl<any> {
    return this.FormVerify.get('cedula')!;
  }

  get placaControl(): AbstractControl<any> {
    return this.FormVerify.get('placa')!;
  }

  get prefijoControl(): AbstractControl<any> {
    return this.FormVerify.get('prefix')!;
  }

    get rifControl(): AbstractControl<string, string> {
    return this.FormVerify.get('rif')!;
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
    }, 6000);
  }

  public async onSubmit() {
    this.showSpinner = true;
    if (this.FormVerify.valid) {
      const clientData = {
        // placa: this.FormVerify.get('placa')?.value.replace('-', ''),
        cedula: this.FormVerify.get('rif')?.value,
      };
      // const creditVerify = this.emissionDetails.data_user.credit
      const creditVerify: boolean = false 
   
      console.log(creditVerify)
    
      this.emission.userIsActive(clientData).subscribe({
        next: (response: any) => {
          
          console.log(response)
          
          if (response.estatus_gene1 === 'ACTIVO' &&  creditVerify === false) {
            console.log("///////Primer if //////")
            this.emissionDetails.userData = response;
            this.navCtrl.navigateRoot(['/admin/Customer/create/sarys/meritop']);
          } else if(response.estatus_gene1 === 'ACTIVO' && creditVerify !== false){
            console.log("///////segundo if //////")
          this.navCtrl.navigateRoot(['/admin/dashboard/sarys']);
          }else if (
            response.estatus_gene1 === '' ||
            response.estatus_gene1 === null
          ) {
            console.log("///////Tercer if //////")
            this.navCtrl.navigateRoot(['/admin/planes/home/user']);
          }
        },
        error: (err: any) => {

          console.log(err)
  
          this.mostrarToast(
            'No se pudo verificar la actividad del usuario',
            'toast-error'
          );
          this.showSpinner = false;
        },
      });
    } else {
      this.FormVerify.markAllAsTouched();
      this.mostrarToast(
        'La placa es obligatoria con formato ( ABC-123 ó ABC-1234 )',
        'toast-error'
      );
      this.showSpinner = false;
    }
  }

  formatPlaca(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (value.length > 3) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }

    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    event.target.value = value;
    this.FormVerify.get('placa')?.setValue(value);
  }

  
    private getAccessToken() {
      const dataToken : any = sessionStorage.getItem('accessToken')
      const decodeToken : any = jwtDecode(dataToken)
      this.emissionDetails.data_user = decodeToken
      return decodeToken
    }

    private UserVerifyMembership(id_user: number){
      const data = {
        id_user: id_user
      }

      this.emission.userIsActive(data).subscribe({
        next: (response: any) => {
          
          // Si el usuario no tiene membresia lo enviamos a los planes para que compre una
          if (response.total === 0) {
            this.navCtrl.navigateRoot(['/admin/planes/home/user']);
            this.showSpinner = false;
          } else {
            // Si el usuario ya tiene una membresia lo enviamos al home para el financiamiento
            this.navCtrl.navigateRoot(['/admin/dashboard/sarys']);
            this.showSpinner = false;
          }
        },
        error: (err: any) => {

          console.log(err)
  
          this.mostrarToast(
            'No se pudo verificar la actividad del usuario',
            'toast-error'
          );
        },
      });
    }

  ngOnInit() {
    // this.showSpinner = true;
    // const user = this.getAccessToken()
    // this.UserVerifyMembership(user.id_user)
  }
}
