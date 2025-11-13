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
import { RouterLink } from '@angular/router';
import { AuthService } from 'src/app/shared/services/auth.service';
import { NavController } from '@ionic/angular';
import { register } from '../../../shared/interface/auth.interface';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { timer } from 'rxjs';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NotificationService } from 'src/app/shared/services/notification.service';

type DataControl = register;

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ReactiveFormsModule,
    HttpClientModule,
    SpinnerComponent,
    NgxMaskDirective,
  ],
  providers: [AuthService, provideNgxMask()],
})
export class RegisterPage {
  public formAuth!: FormGroup;
  private _authService = inject(AuthService);
  public showLoading: boolean = false;
  public correoNoCoincide: boolean = false;
  public correoCoincide: boolean = false;
  public isSecondCheckboxChecked = false;
  public isTerminosAccepted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private navCtrl: NavController,
    private notificationService: NotificationService
  ) {
    this.generateForm();
  }

  public verificarCoincidencia(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const correoVerificado = inputElement.value;
    const correoTomador = this.formAuth.get('email')?.value;
    this.correoNoCoincide = correoTomador !== correoVerificado;
    this.correoCoincide = correoTomador === correoVerificado;
  }

  public onTerminosChange() {
    this.isTerminosAccepted = !this.isTerminosAccepted;
  }

  private generateForm(): void {
    this.formAuth = this.fb.group({
      name: new FormControl('', Validators.required),
      sub_ape: new FormControl('', Validators.required),
      rif: new FormControl('', [Validators.required]),
      prefix: new FormControl('V', Validators.required),
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [
        Validators.required
      ]),
      password: new FormControl('', [Validators.required]),
      credit: ('false')
    });
  }

  get nameControl(): AbstractControl<string, string> {
    return this.formAuth.get('name')!;
  }

  get sub_ape(): AbstractControl<string, string> {
    return this.formAuth.get('sub_ape')!;
  }

  get emailControl(): AbstractControl<string, string> {
    return this.formAuth.get('email')!;
  }

  get phoneControl(): AbstractControl<string, string> {
    return this.formAuth.get('phone')!;
  }

  get passwordControl(): AbstractControl<string, string> {
    return this.formAuth.get('password')!;
  }

  get rifControl(): AbstractControl<string, string> {
    return this.formAuth.get('rif')!;
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

  public async Submit() {
    this.showLoading = true;
    try {
      if (this.formAuth.valid) {
        const data: DataControl = this.formAuth.value;
        data.phone = '0' + data.phone!.slice(0, 3) + '-' + data.phone!.slice(3);
        this._authService.register(data).subscribe({
          next: async (response) => {
            this.mostrarToast('¡Registro exitoso!', 'toast-success');
            this.send_email();
            timer(4000).subscribe(() => {
              this.navCtrl.navigateRoot('/login');
            });
          },
          error:async (err: HttpErrorResponse) => {
            if (err.status === 500) {
              this.mostrarToast(
                `Error de comunicación, ${err.status}`,
                'toast-error'
              );
              this.showLoading = false;
            } else if (err.status === 400) {
              this.showLoading = false;
             await this.mostrarToast('Usuario ya está registrado', 'toast-error');
            }
          },
        });
      } else {
        this.showLoading = false;
        this.formAuth.markAllAsTouched();
       await this.mostrarToast('Completa los campos obligatorios', 'toast-error');
      }
    } catch (e) {
      this.showLoading = false;
      console.error('Error al enviar la informacion', e);
    }
  }


  private send_email() : void {
    const welcomeArys = {
      username: this.formAuth.get('name')?.value + ' ' + this.formAuth.get('sub_ape')?.value,
      logoUrl: 'https://docs.polizaqui.com/logoArys.png',
      toEmail:this.formAuth.get('email')?.value,
      reset:`https://arys.polizaqui.com`
    }
    this.notificationService.welcomeArysService(welcomeArys)
  }
}
