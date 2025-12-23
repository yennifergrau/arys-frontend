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
import { AuthService } from 'src/app/shared/services/auth.service';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { NavController } from '@ionic/angular';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SpinnerComponent,
    RouterLink,
  ],
  providers: [AuthService],
})
export class LoginPage implements OnInit {
  public Formauth!: FormGroup;
  private _authService = inject(AuthService);
  public showSpinner: boolean = false;
  public showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private navCtrl: NavController
  ) {
    this.generateForm();
  }

  ngOnInit(): void {
    localStorage.removeItem('CURRENT_ADJUNTO');
    localStorage.removeItem('CURRENT_SCAN');
    localStorage.removeItem('OCR_CARNET');
    localStorage.removeItem('OCR_LICENCIA');
    localStorage.removeItem('OCR_CEDULA');
  }

  private generateForm(): void {
    this.Formauth = this.fb.group({
      email: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
    });
  }

  public get emailControl(): AbstractControl<string> {
    return this.Formauth.get('email')!;
  }

  public get passwordControl(): AbstractControl<string> {
    return this.Formauth.get('password')!;
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainerRegister');
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

    public cambiarShowPassword(){
    this.showPassword = !this.showPassword

  }

  public async Submit() {
    this.showSpinner = true;
    try {
      console.log('paso')
      if (this.Formauth.valid) {
        const data = this.Formauth.value;
        console.log(data)
        this._authService.login(data).subscribe({
          next: (response: any) => {
            console.log(response)
            this.navCtrl.navigateRoot(['admin/auth-veirify-sarys']);
          },
          error: (err: HttpErrorResponse) => {
            if (err.error.status === 500) {
              this.showSpinner = false;
              this.mostrarToast(
                `Error de comunicación ${err.status}`,
                'toast-error'
              );
            } else if (
              err.error.message === 'Contrase�a inv�lida' ||
              err.error.message === 'Fallo en la autenticación' ||
              err.error.message === 'invalid to password' ||
              err.error.message === 'Failed to authenticate'
            ) {
              this.showSpinner = false;
              this.mostrarToast('¡Credenciales inválidas!', 'toast-error');
            }
          },
        });
      } else {
        this.showSpinner = false;
        this.Formauth.markAllAsTouched();
        this.mostrarToast('¡Completa los campos!', 'toast-error');
      }
    } catch (e) {
      console.error(e);
    }
  }
}
