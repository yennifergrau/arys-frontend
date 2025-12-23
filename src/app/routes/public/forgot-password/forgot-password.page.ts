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
import { NotificationService } from 'src/app/shared/services/notification.service';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { timer } from 'rxjs';
import { AuthService } from 'src/app/shared/services/auth.service';
import { HttpClientModule } from '@angular/common/http';
import { formatValidator } from 'src/utils/match.validator';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    HttpClientModule
  ],
  providers:[AuthService]
})
export class ForgotPasswordPage {
  public FormEmail!: FormGroup;
  private _notificationService = inject(NotificationService);
  public showSpinner: boolean = false;
  public showSuccess: boolean = false;
  public _authService = inject(AuthService)
  public email : any[] = []
  private REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  public emailNoExiste: boolean = false;

  constructor(private fb: FormBuilder, private renderer: Renderer2) {
    this.generateForm();
    // this.getEmailUser()
  }

  private generateForm(): void {
    this.FormEmail = this.fb.group({
      email: new FormControl('', [Validators.required, 
        formatValidator(this.REGEX_EMAIL, 'formatoEmailInvalido')
      ]),
    });
  }

  get EmailControl(): AbstractControl<string> {
    return this.FormEmail.get('email')!;
  }

  mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById(
      'toastContainerForgotPassword'
    );
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

    this.showSpinner = true;
    this.emailNoExiste = false
  
    const emailControl = this.FormEmail.get('email');
    const mensajesError: string[] = [];

    // 1. Marcar el campo como 'tocado'
    this.FormEmail.markAllAsTouched();
  
    // 2. Verificar la validez del formulario y construir los mensajes
    if (this.FormEmail.invalid) {
        this.showSpinner = false;

        if (emailControl?.errors) {
            // Error de Campo Requerido (Validación de Vacío)
            if (emailControl.hasError('required')) {
              console.log('Correo electronico obligatorio')
                this.mostrarToast('El correo electrónico es obligatorio.', 'toast-error');
            }
            // Error de Formato (Validación de RegExp)
            if (emailControl.hasError('formatoEmailInvalido')) {
              console.log('Correo electronico con formato invalido', emailControl.value)
                this.mostrarToast('El correo electrónico no tiene un formato válido.', 'toast-error');
            }
        }
        return; // Detiene la ejecución si hay errores de formulario
      }
    if (this.FormEmail.valid) {
      const next = {
          email:this.FormEmail.get('email')?.value
      }
      console.log(next)
      this._authService.update_password(next).subscribe({
          next:(result) => {
            console.log('Servicio de update_password exitoso', result)
            const inputEmail = this.FormEmail.get('email')?.value?.trim().toLowerCase();
            
            const payload = {
              to_email:this.FormEmail.get('email')?.value,
              reset_link:`https://demo-arys.polizaqui.com/restore/${inputEmail}`,
              user_name:this.FormEmail.get('email')?.value,
              logo_url: 'https://docs.polizaqui.com/logoArys.png'
            }
            console.log(payload)
            this._notificationService.sendEmailPassword(payload)
            .then((response) => {
              // ÉXITO REAL: El correo salió de los servidores de EmailJS
              this.showSpinner = false;
              this.showSuccess = true; // Muestra el banner verde en el HTML
              this.mostrarToast('Enlace de recuperación enviado con éxito', 'toast-success');
              console.log('EmailJS Success:', response);
            })
            .catch((error) => {
              // ERROR DE ENVÍO: Falló EmailJS (ej: límite de correos, error de red)
              this.showSpinner = false;
              this.mostrarToast('Error al enviar el correo. Intente más tarde.', 'toast-error');
              console.error('EmailJS Error:', error);
            });
          },error:(error) => {
            console.log('Error en servico de restore_password', error)
            this.EmailControl.markAllAsTouched()
            this.FormEmail.markAllAsTouched()
            this.emailNoExiste = true;
            this.mostrarToast(`El correo ingresado no esta registrado`,'toast-error')
            this.showSpinner = false
          }
        })
    } else {
        console.log('Correo electronico invalido')
        this.FormEmail.markAllAsTouched()
        this.mostrarToast('Debes ingresar un correo válido','toast-error')
        this.showSpinner = false
    
    }
  }
  

  // private getEmailUser () {
  //   try{
  //     this._authService.view_user_info().subscribe({
  //       next: (result) => {
  //         console.log(result);
  //         this.email = result.users.map((user: any) => user.email);
  //         console.log(this.email);
          
  //       },error:(e)  => {
  //         console.error(e);
  //       }
  //     })
  //   }catch (error) {
  //     console.error(error);
  //   }
  // }
}
