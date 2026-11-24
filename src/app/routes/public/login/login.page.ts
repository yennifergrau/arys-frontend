import { Component, inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
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
import { BiometricAuthService } from 'src/app/shared/services/biometric-auth.service';
import { MobileVersionService } from 'src/app/shared/services/mobile-version.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { NavController, ViewDidEnter, ViewDidLeave } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerComponent,
    RouterLink,
  ],
})
export class LoginPage implements OnInit, ViewDidEnter, ViewDidLeave, OnDestroy {
  public Formauth!: FormGroup;
  private _authService = inject(AuthService);
  private biometricService = inject(BiometricAuthService);
  private mobileVersion = inject(MobileVersionService);
  public showSpinner: boolean = false;
  public showPassword: boolean = false;

  // Estado biométrico
  public biometricAvailable: boolean = false;
  public canLoginWithBiometric: boolean = false;
  public biometricLabel: string = 'Huella dactilar';
  public biometricIsFace: boolean = false;
  public biometricEnrolledEmail: string | null = null;
  public biometricPromptBusy: boolean = false;
  public showBiometricEnrollModal: boolean = false;
  public enrollingBiometric: boolean = false;

  private pendingEnrollCredentials: { email: string; password: string } | null = null;
  private autoPromptTriggered = false;
  private autoPromptTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeListener: PluginListenerHandle | null = null;

  /**
   * Throttle de intentos (defensa en profundidad en cliente).
   * El control real de fuerza bruta debe estar en el backend (rate limit + bloqueo).
   */
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_MS = 30_000;
  private failedAttempts = 0;
  private lockoutUntil = 0;

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
    void this.setupResumeListener();
  }

  ionViewDidEnter(): void {
    void this.refreshBiometricState(true);
  }

  ionViewDidLeave(): void {
    if (this.autoPromptTimer) {
      clearTimeout(this.autoPromptTimer);
      this.autoPromptTimer = null;
    }
    this.autoPromptTriggered = false;
    this.pendingEnrollCredentials = null;
    this.showBiometricEnrollModal = false;
    this.passwordControl.setValue('');
  }

  ngOnDestroy(): void {
    if (this.autoPromptTimer) {
      clearTimeout(this.autoPromptTimer);
      this.autoPromptTimer = null;
    }
    if (this.resumeListener) {
      void this.resumeListener.remove();
      this.resumeListener = null;
    }
    this.pendingEnrollCredentials = null;
  }

  private async setupResumeListener(): Promise<void> {
    this.resumeListener = await this.biometricService.addResumeListener(() => {
      void this.refreshBiometricState(false);
    });
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

  public get maskedEnrolledEmail(): string {
    const email = (this.biometricEnrolledEmail || '').trim();
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0] || ''}***@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
  }

  private async refreshBiometricState(allowAutoPrompt: boolean): Promise<void> {
    const availability = await this.biometricService.checkAvailability();
    const enrolledEmail = availability.isAvailable
      ? await this.biometricService.getEnrolledEmail()
      : null;

    this.biometricAvailable = availability.isAvailable;
    this.biometricLabel = availability.label;
    this.biometricIsFace = availability.isFace;
    this.biometricEnrolledEmail = enrolledEmail;
    this.canLoginWithBiometric = availability.isAvailable && !!enrolledEmail;

    if (this.canLoginWithBiometric && enrolledEmail) {
      if (!this.emailControl.value?.trim()) {
        this.emailControl.setValue(enrolledEmail);
      }

      if (allowAutoPrompt && !this.mobileVersion.isBlocked) {
        const skipAuto = this.biometricService.consumeSkipAutoPrompt();
        if (!skipAuto && !this.autoPromptTriggered) {
          this.autoPromptTriggered = true;
          if (this.autoPromptTimer) {
            clearTimeout(this.autoPromptTimer);
          }
          this.autoPromptTimer = setTimeout(() => {
            if (!this.mobileVersion.isBlocked) {
              void this.loginWithBiometric(true);
            }
          }, 300);
        }
      }
    }
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
      if (toast.parentNode === toastContainer) {
        this.renderer.removeChild(toastContainer, toast);
      }
    }, 5000);
  }

  public cambiarShowPassword() {
    this.showPassword = !this.showPassword;
  }

  public get isButtonDisabled(): boolean {
    return this.showSpinner || this.isLockedOut() || this.showBiometricEnrollModal;
  }

  private isLockedOut(): boolean {
    return Date.now() < this.lockoutUntil;
  }

  private registerFailedAttempt(): void {
    this.failedAttempts++;
    if (this.failedAttempts >= LoginPage.MAX_ATTEMPTS) {
      this.lockoutUntil = Date.now() + LoginPage.LOCKOUT_MS;
      this.failedAttempts = 0;
    }
  }

  private resetAttempts(): void {
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
  }

  private showRemainingLockout(): void {
    const seconds = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
    this.mostrarToast(
      `Demasiados intentos. Espera ${seconds}s antes de reintentar.`,
      'toast-error'
    );
  }

  private navigateAfterLogin(): void {
    this.navCtrl.navigateRoot(['admin/auth-veirify-sarys']);
  }

  public async loginWithBiometric(isAutoTrigger = false): Promise<void> {
    if (this.isLockedOut()) {
      if (!isAutoTrigger) {
        this.showRemainingLockout();
      }
      return;
    }
    if (this.biometricPromptBusy || this.showSpinner || this.showBiometricEnrollModal) {
      return;
    }

    this.biometricPromptBusy = true;
    const authResult = await this.biometricService.authenticateAndGetCredentials(
      this.biometricLabel
    );
    this.biometricPromptBusy = false;

    if (authResult.status === 'cancelled') {
      return;
    }

    if (authResult.status === 'lockout' || authResult.status === 'error') {
      this.mostrarToast(authResult.message, 'toast-error');
      return;
    }

    this.showSpinner = true;
    this._authService.login(authResult.credentials).subscribe({
      next: () => {
        this.showSpinner = false;
        this.resetAttempts();
        this.navigateAfterLogin();
      },
      error: async (err: HttpErrorResponse) => {
        this.showSpinner = false;

        if (err.status === 426) {
          return;
        }

        if (err.status === 429) {
          this.mostrarToast(
            'Demasiados intentos. Espera unos minutos antes de reintentar.',
            'toast-error'
          );
          return;
        }

        if (err.status === 0 || err?.error?.status === 500 || err.status >= 500) {
          this.mostrarToast(
            `Error de comunicación ${err.status || ''}`.trim(),
            'toast-error'
          );
          return;
        }

        await this.biometricService.clearCredentials();
        this.canLoginWithBiometric = false;
        this.biometricEnrolledEmail = null;
        this.mostrarToast(
          'Tus credenciales cambiaron. Ingresa con tu contraseña para reactivar tu huella.',
          'toast-error'
        );
      },
    });
  }

  public async unlinkBiometric(): Promise<void> {
    await this.biometricService.clearCredentials();
    this.canLoginWithBiometric = false;
    this.biometricEnrolledEmail = null;
    this.Formauth.reset({ email: '', password: '' });
    this.mostrarToast('Cuenta biométrica desvinculada de este dispositivo.', 'toast-success');
  }

  public async confirmBiometricEnrollment(): Promise<void> {
    if (!this.pendingEnrollCredentials || this.enrollingBiometric) {
      return;
    }

    this.enrollingBiometric = true;
    const { email, password } = this.pendingEnrollCredentials;
    const result = await this.biometricService.enrollWithConfirmation(
      email,
      password,
      this.biometricLabel
    );
    this.enrollingBiometric = false;

    if (result.enrolled) {
      this.pendingEnrollCredentials = null;
      this.showBiometricEnrollModal = false;
      this.mostrarToast(`¡Acceso con ${this.biometricLabel.toLowerCase()} activado!`, 'toast-success');
      this.navigateAfterLogin();
      return;
    }

    if (result.cancelled) {
      // El usuario canceló el lector del sistema: mantiene el modal abierto por si desea reintentar o tocar "Ahora no".
      return;
    }

    if (result.message) {
      this.mostrarToast(result.message, 'toast-error');
    }
    this.pendingEnrollCredentials = null;
    this.showBiometricEnrollModal = false;
    this.navigateAfterLogin();
  }

  public skipBiometricEnrollment(): void {
    this.pendingEnrollCredentials = null;
    this.showBiometricEnrollModal = false;
    this.navigateAfterLogin();
  }

  public async Submit() {
    if (this.isLockedOut()) {
      this.showRemainingLockout();
      return;
    }
    this.showSpinner = true;
    try {
      if (this.Formauth.valid) {
        const rawValue = this.Formauth.value;
        const email = String(rawValue.email || '').trim();
        const password = String(rawValue.password || '');
        const data = { email, password };

        this._authService.login(data).subscribe({
          next: async () => {
            this.showSpinner = false;
            this.resetAttempts();

            const availability = await this.biometricService.checkAvailability();
            if (!availability.isAvailable) {
              this.navigateAfterLogin();
              return;
            }

            this.biometricAvailable = true;
            this.biometricLabel = availability.label;
            this.biometricIsFace = availability.isFace;

            const enrolledEmail = await this.biometricService.getEnrolledEmail();
            if (enrolledEmail && enrolledEmail.toLowerCase() === email.toLowerCase()) {
              await this.biometricService.syncCredentialsIfEnrolled(email, password);
              this.navigateAfterLogin();
              return;
            }

            this.pendingEnrollCredentials = { email, password };
            this.showBiometricEnrollModal = true;
          },
          error: (err: HttpErrorResponse) => {
            this.showSpinner = false;

            if (err.status === 426) {
              return;
            }

            if (err.status === 0 || err?.error?.status === 500 || err.status >= 500) {
              this.mostrarToast(`Error de comunicación ${err.status || ''}`.trim(), 'toast-error');
              return;
            }

            this.registerFailedAttempt();
            this.mostrarToast('¡Credenciales inválidas!', 'toast-error');
          },
        });
      } else {
        this.showSpinner = false;
        this.Formauth.markAllAsTouched();
        this.mostrarToast('¡Completa los campos!', 'toast-error');
      }
    } catch (e) {
      this.showSpinner = false;
      console.error(e);
    }
  }
}
