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
import { DataArysService } from '../services/data-arys.service';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';
import { formatCedrifRif, parseCedrifCredit } from '../utils/meritop-identity.util';

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
  /** Cédula por defecto en el input (solo fallback visual). */
  private readonly defaultVerifyDocument = '';

  public FormVerify!: FormGroup;
  public showSpinner = false;
  /** Solo true cuando hace falta que el usuario complete o corrija el documento. */
  public showVerifyForm = false;
  public autoVerifyInProgress = false;
  private emission = inject(EmissionService);
  private emissionDetails = inject(EmissionDetailsService);
  private arysService = inject(DataArysService);
  private tokenStore = inject(TokenStoreService);

  constructor(
    private fb: FormBuilder,
    private renderer: Renderer2,
    private navCtrl: NavController
  ) {
    this.generateForm();
  }

  private generateForm(): void {
    this.FormVerify = this.fb.group({
      rif: new FormControl(this.defaultVerifyDocument, Validators.required),
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

  private extractCedulaNumber(raw: any): string {
    const s = raw != null ? String(raw).trim() : '';
    if (!s) return '';
    // Acepta formatos como "V28317753", "E-28.317.753", "J 28317753" → "28317753"
    const digits = s.replace(/\D/g, '');
    return digits;
  }

  /** Membresía desde BD (token) antes de `userIsActive`, para enviar `certificado` en el POST y alinear filas. */
  private async prefetchMembership(): Promise<{ rows: any[]; picked: any | null }> {
    const user = this.getAccessToken();
    const stored = sessionStorage.getItem('id_member');
    const idMember = stored
      ? Number(stored)
      : user.id_member != null
        ? Number(user.id_member)
        : null;

    let membershipResult: any = null;
    if (idMember != null && !Number.isNaN(idMember) && idMember > 0) {
      membershipResult = await firstValueFrom(this.arysService.get_membership(idMember));
    } else if (user.email) {
      membershipResult = await firstValueFrom(
        this.arysService.get_membership_by_email(String(user.email))
      );
    }

    const rows =
      membershipResult?.status && Array.isArray(membershipResult.data)
        ? membershipResult.data
        : [];
    const picked = rows[0] ?? null;
    return { rows, picked };
  }

  private membershipRifFromRow(row: any | null | undefined): string {
    const parsed = parseCedrifCredit(row?.cedrif_membership);
    return parsed ? formatCedrifRif(parsed.doctype, parsed.docid) : '';
  }

  private buildStatusRequestData(
    cedula: string,
    picked: any | null | undefined
  ): { cedula: string; certificado?: string; placa?: string } {
    const clientData: { cedula: string; certificado?: string; placa?: string } = {
      cedula,
    };
    const cert = picked?.certificate != null ? String(picked.certificate).trim() : '';
    if (cert) {
      clientData.certificado = cert;
    }
    const plate =
      picked?.vehicle_plate != null ? String(picked.vehicle_plate).trim().replace(/-/g, '') : '';
    if (plate) {
      clientData.placa = plate;
    }
    return clientData;
  }

  private async persistMembershipCedulaIfNeeded(
    picked: any,
    rifToPersist: string
  ): Promise<any> {
    const rif = String(rifToPersist ?? '').trim();
    const idMember = picked?.id_master;
    if (!rif || idMember == null) return picked;

    const existingRif = this.membershipRifFromRow(picked);
    if (rif === existingRif) return picked;

    try {
      const updateRes = await firstValueFrom(
        this.arysService.update_membership_cedrif_membership(idMember, { rif })
      );
      if (updateRes?.status === false) {
        this.mostrarToast(
          String(
            updateRes?.message || 'La verificación fue correcta pero no se pudo guardar la cédula en la membresía.'
          ),
          'toast-error'
        );
        return picked;
      }
      return { ...picked, cedrif_membership: rif };
    } catch {
      this.mostrarToast(
        'La verificación fue correcta pero no se pudo guardar la cédula en la membresía.',
        'toast-error'
      );
      return picked;
    }
  }

  private callUserIsActive(
    clientData: { cedula: string; certificado?: string; placa?: string },
    pre: { rows: any[]; picked: any | null } | null,
    rifToPersist?: string | null
  ): void {
    this.emission.userIsActive(clientData).subscribe({
      next: async (response: any) => {
        try {
          const status = response?.estatus_gene1 != null ? String(response.estatus_gene1).trim() : '';

          if (status === 'ACTIVO') {
            const user = this.getAccessToken();

            try {
              let rows = pre?.rows ?? [];
              let picked = pre?.picked ?? null;

              if (!rows.length) {
                const stored = sessionStorage.getItem('id_member');
                const idMember = stored
                  ? Number(stored)
                  : user.id_member != null
                    ? Number(user.id_member)
                    : null;

                const membershipResult = idMember
                  ? await firstValueFrom(this.arysService.get_membership(idMember))
                  : user.email
                    ? await firstValueFrom(
                        this.arysService.get_membership_by_email(String(user.email))
                      )
                    : null;

                rows =
                  membershipResult?.status && Array.isArray(membershipResult.data)
                    ? membershipResult.data
                    : [];
              }

              const certFromStatus = String(response?.certificado ?? '').trim();
              const matched = certFromStatus
                ? rows.find((r: any) => String(r?.certificate ?? '').trim() === certFromStatus) ??
                  null
                : null;
              picked = matched ?? picked ?? rows[0] ?? null;

              if (picked?.id_master != null) {
                sessionStorage.setItem('id_member', String(picked.id_master));
              }

              if (rifToPersist) {
                picked = await this.persistMembershipCedulaIfNeeded(picked, rifToPersist);
              }

              this.emissionDetails.persistUserDataAfterVerification(response, picked);

              this.navCtrl.navigateRoot(['/admin/dashboard/sarys']);
            } catch {
              this.emissionDetails.userData = response;
              this.navCtrl.navigateRoot(['/admin/dashboard/sarys']);
            }
            return;
          }

          if (status === '' || status === '0') {
            this.mostrarToast('Usuario no encontrado o inválido.', 'toast-error');
            this.revealVerifyForm();
            return;
          }
          if (status === 'INACTIVO') {
            this.mostrarToast('Tu cuenta está inactiva. Contacta soporte.', 'toast-error');
            this.revealVerifyForm();
            return;
          }
          this.mostrarToast(`No se pudo validar estatus (${status || 'desconocido'}).`, 'toast-error');
          this.revealVerifyForm();
        } finally {
          this.finishAutoVerifyUi();
        }
      },
      error: (err: any) => {
        console.log(err);
        this.mostrarToast('No se pudo verificar la actividad del usuario', 'toast-error');
        this.revealVerifyForm();
      },
    });
  }

  public async onSubmit() {
    try {
      if (!this.FormVerify.valid) {
        this.FormVerify.markAllAsTouched();
        this.mostrarToast('La cédula es obligatoria', 'toast-error');
        return;
      }

      this.showVerifyForm = true;
      this.showSpinner = true;
      this.autoVerifyInProgress = false;
      const cedulaFromForm = this.extractCedulaNumber(this.FormVerify.get('rif')?.value);
      const prefix = String(this.FormVerify.get('prefix')?.value || 'V').trim();
      let pre: { rows: any[]; picked: any | null } | null = null;
      try {
        pre = await this.prefetchMembership();
      } catch {
        pre = null;
      }

      const cedulaFromMembership =
        this.extractCedulaNumber(pre?.picked?.cedrif_membership);

      const clientData = this.buildStatusRequestData(
        cedulaFromMembership || cedulaFromForm,
        pre?.picked
      );

      // Sin cedrif_membership en BD → guardar la cédula ingresada para auto-verificar la próxima vez.
      const rifToPersist = cedulaFromMembership
        ? null
        : formatCedrifRif(prefix, cedulaFromForm);

      this.callUserIsActive(clientData, pre, rifToPersist);
    } finally {
      if (!this.FormVerify.valid) {
        this.showSpinner = false;
      }
    }
  }

  private finishAutoVerifyUi(): void {
    this.showSpinner = false;
    this.autoVerifyInProgress = false;
  }

  private revealVerifyForm(): void {
    this.showVerifyForm = true;
    this.finishAutoVerifyUi();
  }

  private async runAutomatedVerification(): Promise<void> {
    const token = this.tokenStore.getAccessTokenSync();
    if (!token?.trim()) {
      await this.navCtrl.navigateRoot(['/login']);
      return;
    }

    this.autoVerifyInProgress = true;
    this.showSpinner = true;
    this.showVerifyForm = false;
    this.FormVerify.patchValue({ prefix: 'V' });

    let pre: { rows: any[]; picked: any | null } | null = null;
    try {
      pre = await this.prefetchMembership();
    } catch (e) {
      console.warn('prefetchMembership', e);
      pre = null;
    }

    const cedulaFromMembership =
      this.extractCedulaNumber(pre?.picked?.cedrif_membership);

    if (!cedulaFromMembership) {
      this.revealVerifyForm();
      return;
    }

    this.FormVerify.patchValue({ rif: cedulaFromMembership });

    const clientData = this.buildStatusRequestData(cedulaFromMembership, pre?.picked);

    this.callUserIsActive(clientData, pre, null);
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
      const dataToken : any = this.tokenStore.getAccessTokenSync()
      if (!dataToken) return {}
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
            this.navCtrl.navigateRoot(['/admin/service-orders/pending']);
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

  ngOnInit(): void {
    const hasToken = !!this.tokenStore.getAccessTokenSync()?.trim();
    if (!hasToken) {
      void this.navCtrl.navigateRoot(['/login']);
      return;
    }
    this.showSpinner = true;
    this.autoVerifyInProgress = true;
    void this.runAutomatedVerification();
  }
}
