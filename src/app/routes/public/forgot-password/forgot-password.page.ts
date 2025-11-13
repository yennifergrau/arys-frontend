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

  constructor(private fb: FormBuilder, private renderer: Renderer2) {
    this.generateForm();
    this.getEmailUser()
  }

  private generateForm(): void {
    this.FormEmail = this.fb.group({
      email: new FormControl('', [Validators.required, Validators.email]),
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

  public async onSubmit() {
    this.showSpinner = true;
    try {
      if (this.FormEmail.valid) {
        // this.mostrarToast('¡Correo enviado con éxito!', 'toast-success');
        this.showSuccess = true;
        const inputEmail = this.FormEmail.get('email')?.value?.trim().toLowerCase();
        const emailExiste = this.email.some(e => e.toLowerCase() === inputEmail);
        // const emailPassword = {
        //   userName: this.FormEmail.get('email')?.value,
        //   logoUrl: 'https://docs.polizaqui.com/logoArys.png',
        //   toEmail: this.FormEmail.get('email')?.value,
        //   reset: `https://arys.polizaqui.com/restore-password/user/${email}`,
        // };
        // timer(2000).subscribe(() => {
        //   this.showSpinner = false;
        // });
        // this._notificationService.sendEmailPassword(emailPassword);
      } else {
        this.showSpinner = false;
        this.FormEmail.markAllAsTouched();
        this.mostrarToast('¡El campo es obligatorio!', 'toast-error');
      }
    } catch (e) {
      this.showSpinner = false;
      console.log('¡Error al comunicarse con emailJs', e);
    }
  }


  public async Submit() {
    this.showSpinner = true;
  
    if (this.FormEmail.valid) {
      const inputEmail = this.FormEmail.get('email')?.value?.trim().toLowerCase();
      const emailExiste = this.email.some(e => e.toLowerCase() === inputEmail);
  
      if (emailExiste) {
        this.mostrarToast('¡Correo encontrado!', 'toast-success');
        this.showSuccess = true;
          const emailPassword = {
          userName: this.FormEmail.get('email')?.value,
          logoUrl: 'https://docs.polizaqui.com/logoArys.png',
          toEmail: this.FormEmail.get('email')?.value,
          reset: `https://arys.polizaqui.com/restore-password/user/${emailExiste}`,
        };
        timer(2000).subscribe(() => {
          this.showSpinner = false;
        });
        this._notificationService.sendEmailPassword(emailPassword);

      } else {
        this.mostrarToast('Correo no registrado.', 'toast-error');
        this.showSuccess = false;
      }
    } else {
      this.mostrarToast('Por favor ingresa un correo válido.', 'toast-error');
    }
  
    this.showSpinner = false;
  }
  

  private getEmailUser () {
    try{
      this._authService.view_user_info().subscribe({
        next: (result) => {
          console.log(result);
          this.email = result.users.map((user: any) => user.email);
          console.log(this.email);
          
        },error:(e)  => {
          console.error(e);
        }
      })
    }catch (error) {
      console.error(error);
    }
  }
}
