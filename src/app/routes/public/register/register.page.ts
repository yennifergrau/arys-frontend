import { Component, OnInit, inject, Renderer2 } from '@angular/core';
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
import { matchFieldsValidator, formatValidator, strongPasswordValidator, strongPasswordErrorMessage } from 'src/utils/match.validator';

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
export class RegisterPage implements OnInit {
  public formAuth!: FormGroup;
  private _authService = inject(AuthService);
  public showLoading: boolean = false;
  public correoNoCoincide: boolean = false;
  public correoCoincide: boolean = false;
  public isSecondCheckboxChecked = false;
  public isTerminosAccepted: boolean = false;
  public showTerminosError: boolean = false;
  public showPassword: boolean = false;
  private REGEX_STRING = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]{1,20}$/
  private REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private REGEX_NUMBER = /^(212|412|414|424|416|426)[0-9]{7}$/;

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private navCtrl: NavController,
    private notificationService: NotificationService
  ) {
    this.generateForm();
  }

  ngOnInit(): void {
    // Si un campo falla por el servidor y el usuario lo cambia, limpiar ese error
    this.emailControl.valueChanges.subscribe(() => {
      this.clearServerFieldError(this.emailControl, ['emailTaken', 'serverError']);
      this.clearToast();
      this.syncEmailMatchFlags();
    });
    this.confirEmailControl.valueChanges.subscribe(() => {
      this.clearServerFieldError(this.emailControl, ['emailTaken', 'serverError']);
      this.clearToast();
      this.syncEmailMatchFlags();
    });
    this.rifControl.valueChanges.subscribe(() => {
      if (this.clearServerFieldError(this.rifControl, ['rifTaken', 'serverError'])) {
        this.clearToast();
      }
    });
    this.phoneControl.valueChanges.subscribe(() => {
      if (this.clearServerFieldError(this.phoneControl, ['phoneTaken', 'serverError'])) {
        this.clearToast();
      }
    });
  }

  private syncEmailMatchFlags(): void {
    const email = this.emailControl.value ?? '';
    const confirm = this.confirEmailControl.value ?? '';
    this.correoNoCoincide = email !== confirm && confirm !== '';
    this.correoCoincide = email === confirm && this.emailControl.valid && email !== '';
  }

  /** @returns true si había un error de servidor y se limpió */
  private clearServerFieldError(ctrl: AbstractControl, keys: string[]): boolean {
    const hasAny = keys.some((key) => ctrl.hasError(key));
    if (!hasAny) return false;
    const errors = { ...(ctrl.errors || {}) };
    keys.forEach((key) => delete errors[key]);
    ctrl.setErrors(Object.keys(errors).length ? errors : null);
    return true;
  }

  private clearToast(): void {
    const toastContainer = document.getElementById('toastContainer');
    if (toastContainer) {
      toastContainer.innerHTML = '';
    }
  }

  private extractRegisterErrorMessage(error: any): {
    message: string;
    field: 'email' | 'rif' | 'phone' | 'password' | null;
  } {
    const body = error?.error;
    const status = error?.status;
    const nestedErrors = body && typeof body === 'object' ? body.errors : undefined;
    const emailFieldErrors: string[] = [];
    const rifFieldErrors: string[] = [];
    const phoneFieldErrors: string[] = [];

    if (nestedErrors?.email) {
      emailFieldErrors.push(...(Array.isArray(nestedErrors.email) ? nestedErrors.email : [String(nestedErrors.email)]));
    }
    if (nestedErrors?.correo) {
      emailFieldErrors.push(...(Array.isArray(nestedErrors.correo) ? nestedErrors.correo : [String(nestedErrors.correo)]));
    }
    if (nestedErrors?.rif) {
      rifFieldErrors.push(...(Array.isArray(nestedErrors.rif) ? nestedErrors.rif : [String(nestedErrors.rif)]));
    }
    if (nestedErrors?.documento) {
      rifFieldErrors.push(...(Array.isArray(nestedErrors.documento) ? nestedErrors.documento : [String(nestedErrors.documento)]));
    }
    if (nestedErrors?.phone || nestedErrors?.telefono) {
      const phoneErr = nestedErrors?.phone ?? nestedErrors?.telefono;
      phoneFieldErrors.push(...(Array.isArray(phoneErr) ? phoneErr : [String(phoneErr)]));
    }

    const rawMessage = String(
      (typeof body === 'string' ? body : '') ||
      body?.message ||
      body?.error ||
      body?.msg ||
      emailFieldErrors[0] ||
      rifFieldErrors[0] ||
      phoneFieldErrors[0] ||
      ''
    ).trim();
    const lower = rawMessage.toLowerCase();

    const looksLikeRifError =
      rifFieldErrors.length > 0 ||
      /(documento|identidad|cedula|cédula|\brif\b)/.test(lower);

    if (looksLikeRifError) {
      return {
        message: rawMessage || 'Este documento de identidad ya está registrado.',
        field: 'rif',
      };
    }

    const looksLikePhoneError =
      phoneFieldErrors.length > 0 ||
      /(tel[eé]fono|\bphone\b|celular)/.test(lower);

    if (looksLikePhoneError) {
      return {
        message: rawMessage || 'Este teléfono ya está registrado.',
        field: 'phone',
      };
    }

    // Español e inglés: "Email already registered", "correo ya registrado", etc.
    const looksLikeEmailError =
      emailFieldErrors.length > 0 ||
      status === 409 ||
      /email already|already registered|e-?mail.*regist|correo ya|ya .*registr|usuario ya/.test(lower) ||
      (/(e-?mail|correo|usuario)/.test(lower) &&
        /(already|exist|ya|regist|duplicate|unique|tomado|usado|ocupado)/.test(lower));

    if (looksLikeEmailError) {
      return {
        message: 'Este correo ya está registrado. Usa otro correo o inicia sesión.',
        field: 'email',
      };
    }

    if (status === 422) {
      const pwdHint = /password|contrase[nñ]a|clave/.test(lower);
      return {
        message: rawMessage || (pwdHint
          ? 'La contraseña no cumple los requisitos de seguridad.'
          : 'Revisa los datos del formulario e intenta nuevamente.'),
        field: pwdHint ? 'password' : null,
      };
    }

    // 400 genérico sin pista clara: mostrar mensaje del API, sin marcar correo
    return {
      message: rawMessage || 'No se pudo completar el registro. Intenta nuevamente.',
      field: null,
    };
  }

  public verificarCoincidencia(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const correoVerificado = inputElement.value;
    const correoTomador = this.formAuth.get('email')?.value;
    this.correoNoCoincide = correoTomador !== correoVerificado;
    this.correoCoincide = (correoTomador === correoVerificado) && this.emailControl.valid;
  }

  public onTerminosChange() {
    this.isTerminosAccepted = !this.isTerminosAccepted;
     if(this.isTerminosAccepted){
      this.showTerminosError = false;
    }
  }

  private generateForm(): void {
    this.formAuth = this.fb.group({
      name: new FormControl('', [Validators.required,
        formatValidator(this.REGEX_STRING, 'formatoNombreInvalido')
      ]),
      sub_ape: new FormControl('', [Validators.required,
        formatValidator(this.REGEX_STRING, 'formatoApellidoInvalido')
      ]),
      rif: new FormControl('', [Validators.required]),
      prefix: new FormControl('V', Validators.required),
      email: new FormControl('', [Validators.required,
        formatValidator(this.REGEX_EMAIL, 'formatoEmailInvalido')
      ]),
      confirEmail: new FormControl('', [Validators.required,
        formatValidator(this.REGEX_EMAIL, 'formatoEmailInvalido')
      ]),
      phone: new FormControl('', [Validators.required,
        formatValidator(this.REGEX_NUMBER, 'formatoTelefonoInvalido')
      ]),
      password: new FormControl('', [Validators.required,
        strongPasswordValidator(10)
      ]),
      credit: ('false')
    }, {
      validators: matchFieldsValidator('email', 'confirEmail')
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

  get confirEmailControl(): AbstractControl<string, string> {
    return this.formAuth.get('confirEmail')!;
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

  public cambiarShowPassword(){
    this.showPassword = !this.showPassword

  }

  private normalizePhoneForBackend(rawPhone: string): string | null {
    // Keep only digits from masked/prefixed input.
    let digits = String(rawPhone || '').replace(/\D/g, '');

    // Accept +58XXXXXXXXXX format from UI mask and convert to local 10 digits.
    if (digits.startsWith('58') && digits.length >= 12) {
      digits = digits.slice(2);
    }

    // If comes as 11 digits with leading zero, use local 10-digit core.
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Expected Venezuela mobile/local format used by current backend/client rules.
    const isValidCore = /^(212|412|414|424|416|426)\d{7}$/.test(digits);
    if (!isValidCore) return null;

    return `0${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  private normalizeRifForBackend(rawRif: string): string | null {
    const digits = String(rawRif ?? '').replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 12) return null;
    return digits;
  }

  private procesarErroresDeFormulario() {
    const mensajesError: string[] = [];
    const nombresLegibles: Record<string, string> = {
      name: 'nombre',
      sub_ape: 'apellido',
      rif: 'documento de identidad',
      email: 'correo electrónico',
      confirEmail: 'confirmación de correo',
      phone: 'teléfono',
      password: 'contraseña',
    };

    const campos = ['name', 'sub_ape', 'rif', 'email', 'confirEmail', 'phone', 'password'];

    for (const campo of campos) {
      const control = this.formAuth.get(campo);
      const nombreMostrar = nombresLegibles[campo];

      if (!control?.errors) continue;

      if (control.hasError('required')) {
        mensajesError.push(`El campo ${nombreMostrar} es obligatorio.`);
      }
      if (control.hasError('formatoNombreInvalido') || control.hasError('formatoApellidoInvalido')) {
        mensajesError.push(`El ${nombreMostrar} no tiene el formato correcto (solo letras).`);
      }
      if (control.hasError('formatoEmailInvalido')) {
        mensajesError.push('El formato del correo electrónico es inválido.');
      }
      if (control.hasError('formatoTelefonoInvalido')) {
        mensajesError.push('El formato del teléfono debe ser venezolano.');
      }
      if (control.hasError('emailTaken')) {
        mensajesError.push('Este correo ya está registrado. Usa otro correo o inicia sesión.');
      }
      if (control.hasError('rifTaken')) {
        mensajesError.push('Este documento de identidad ya está registrado.');
      }
      if (control.hasError('phoneTaken')) {
        mensajesError.push('Este teléfono ya está registrado.');
      }
      if (control.hasError('mustMatch')) {
        mensajesError.push('Los correos electrónicos no coinciden.');
      }

      const pwdMsg = strongPasswordErrorMessage(control.errors, 10);
      if (pwdMsg) {
        mensajesError.push(pwdMsg);
      }
    }

    if (this.showTerminosError) {
      mensajesError.push('Debes aceptar los términos y condiciones.');
    }

    if (mensajesError.length > 0) {
      const mensajesUnicos = [...new Set(mensajesError)];
      if (mensajesUnicos.length === 1) {
        this.mostrarToast(mensajesUnicos[0], 'toast-error');
      } else {
        this.mostrarToast(mensajesUnicos.slice(0, 3).join(' '), 'toast-error');
      }
    } else {
      this.mostrarToast('Por favor, corrige todos los errores marcados en el formulario.', 'toast-error');
    }
  }

  public async Submit() {
    this.formAuth.markAllAsTouched();
    this.showTerminosError = !this.isTerminosAccepted;

    // 1. Verificar si el formulario es inválido o términos no aceptados
    if (this.formAuth.invalid || this.showTerminosError) {
      this.procesarErroresDeFormulario();
      return;
    }

    this.showLoading = true;
    try {
        const formValue = this.formAuth.value;
        const normalizedPhone = this.normalizePhoneForBackend(String(formValue.phone ?? ''));
        if (!normalizedPhone) {
          this.showLoading = false;
          this.mostrarToast('El teléfono no tiene un formato válido.', 'toast-error');
          return;
        }

        const normalizedRif = this.normalizeRifForBackend(String(formValue.rif ?? ''));
        if (!normalizedRif) {
          this.showLoading = false;
          this.mostrarToast('El documento de identidad no tiene un formato válido.', 'toast-error');
          return;
        }

        const data: DataControl = {
          name: formValue.name,
          sub_ape: formValue.sub_ape,
          email: formValue.email,
          phone: normalizedPhone,
          password: formValue.password,
          prefix: formValue.prefix,
          rif: normalizedRif,
        };

        this._authService.register(data).subscribe({
          next: async (response) => {
            this.showLoading = false;
            this.mostrarToast('¡Registro exitoso!', 'toast-success');
            this.send_email();
            timer(4000).subscribe(() => {
              this.navCtrl.navigateRoot('/login');
            });
          },
          error: async (err: HttpErrorResponse) => {
            this.showLoading = false;
            if (err.status >= 500) {
              this.mostrarToast(`Error de comunicación, ${err.status}`, 'toast-error');
              return;
            }

            const { message, field } = this.extractRegisterErrorMessage(err);

            if (field === 'email') {
              this.emailControl.setErrors({
                ...(this.emailControl.errors || {}),
                emailTaken: true,
              });
              this.emailControl.markAsTouched();
            } else if (field === 'rif') {
              this.rifControl.setErrors({
                ...(this.rifControl.errors || {}),
                rifTaken: true,
              });
              this.rifControl.markAsTouched();
            } else if (field === 'phone') {
              this.phoneControl.setErrors({
                ...(this.phoneControl.errors || {}),
                phoneTaken: true,
              });
              this.phoneControl.markAsTouched();
            }

            this.mostrarToast(message, 'toast-error');
          },
        });
    } catch (e) {
      this.showLoading = false;
      console.error('Error al enviar la informacion', e);
    }
  }


  private send_email(): void {
    const payload = {
      email: this.formAuth.get('email')?.value,
      nombre: `${this.formAuth.get('name')?.value ?? ''} ${this.formAuth.get('sub_ape')?.value ?? ''}`.trim(),
      logo_url: 'https://docs.polizaqui.com/logoArys.png',
    };
    this.notificationService.welcomeArysService(payload);
  }
}
