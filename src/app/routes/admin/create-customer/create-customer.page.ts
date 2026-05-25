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

import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';

import { SpinnerComponent } from 'src/app/shared/components/spinner.component';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EmissionDetailsService } from '../services/emission-details.service';

import { MeritopService } from '../services/meritop.service';

import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { DataArysService } from '../services/data-arys.service';

import { UserAccessService } from '../services/user-access.service';

import { jwtDecode } from 'jwt-decode';

import { EMPTY, firstValueFrom, of, switchMap } from 'rxjs';

import {

  creditLineValidationBlocks,

  formatCedrifRif,

  parseCedrifCredit,

} from '../utils/meritop-identity.util';



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

    NgxMaskDirective,

  ],

  providers: [EmissionDetailsService, MeritopService, provideNgxMask(), DataArysService],

})

export class CreateCustomerPage implements OnInit {

  private _emisionService = inject(EmissionDetailsService);

  private _meritopService = inject(MeritopService);

  private _arysService = inject(DataArysService);

  private access = inject(UserAccessService);

  public showLoading = false;

  public emissionForm!: FormGroup;



  private idMember: number | null = null;



  constructor(

    private renderer: Renderer2,

    private nav: Router,

    private route: ActivatedRoute,

    private fb: FormBuilder

  ) {

    this.generateForm();

  }



  private generateForm() {

    this.emissionForm = this.fb.group({

      ip: new FormControl('127.0.0.1'),

      clientId: this.fb.group({

        doctype: new FormControl('', Validators.required),

        docid: new FormControl('', Validators.required),

      }),

      name: new FormControl(''),

      last_name: new FormControl(''),

      email: new FormControl(''),

      phone_number: new FormControl(''),

      account_number: new FormControl('', Validators.required),

      product_code: new FormControl('000000003'),

      segment: new FormControl(''),

    });

  }



  get accountControl(): AbstractControl<string> {

    return this.emissionForm.get('account_number')!;

  }



  private getAccessToken() {

    const dataToken: string | null = sessionStorage.getItem('accessToken');

    if (!dataToken) return null;

    return jwtDecode(dataToken) as Record<string, unknown>;

  }



  async ngOnInit() {

    const qid = this.route.snapshot.queryParamMap.get('id');

    this.idMember = qid ? Number(qid) : null;

    if (!this.idMember) {

      const s = sessionStorage.getItem('id_member');

      this.idMember = s ? Number(s) : null;

    }



    this.showLoading = true;

    try {

      await this.prefillFormFromMembership();

    } finally {

      this.showLoading = false;

    }

  }



  /** Cédula editable: por defecto la de la membresía (`cedrif_credit` o `cedrif_membership`). */

  private async prefillFormFromMembership(): Promise<void> {

    const token = this.getAccessToken();

    let docFromMembership: { doctype: string; docid: string } | null = null;



    if (this.idMember) {

      try {

        const res = await firstValueFrom(this._arysService.get_membership(this.idMember));

        const row =

          res?.status && Array.isArray(res.data) && res.data.length ? res.data[0] : null;

        const parsed = parseCedrifCredit(row?.cedrif_credit ?? row?.cedrif_membership);

        if (parsed) {

          docFromMembership = { doctype: parsed.doctype, docid: String(parsed.docid) };

        }

      } catch {

        // noop

      }

    }



    if (!docFromMembership) {

      try {

        const raw = localStorage.getItem('userData');

        const userData = raw ? JSON.parse(raw) : null;

        const parsed = parseCedrifCredit(

          userData?.cedrif_credit ?? userData?.cedrif_membership

        );

        if (parsed) {

          docFromMembership = { doctype: parsed.doctype, docid: String(parsed.docid) };

        }

      } catch {

        // noop

      }

    }



    this.emissionForm.patchValue({

      clientId: {

        doctype: docFromMembership?.doctype || String(token?.['prefix'] || 'V'),

        docid: docFromMembership?.docid || String(token?.['rif'] || ''),

      },

      name: String(token?.['name'] || ''),

      last_name: String(token?.['sub_ape'] || ''),

      email: String(token?.['email'] || ''),

      phone_number: String(token?.['phone'] || '').replace(/[^0-9]/g, ''),

      account_number: '',

      segment: '1',

    });

  }



  private buildRifFromForm(): string {

    const clientId = this.emissionForm.get('clientId') as FormGroup;

    const doctype = String(clientId.get('doctype')?.value || 'V').trim();

    const docid = String(clientId.get('docid')?.value || '').trim();

    return formatCedrifRif(doctype, docid);

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



  private persistCedrifCreditLocally(rif: string, result: any): void {
    const lineId =
      result?.credit_line_id ??
      result?.credit_line?.credit_line_id ??
      result?.credit_line?.id ??
      null;
    this._emisionService.mergeUserDataFromMembership({
      cedrif_credit: rif,
      ...(lineId != null ? { credit_line_id: String(lineId) } : {}),
    });
  }

  private handleRetryCreditLineResult(result: any, idMember: number, rif: string): void {

    if (result.status === true) {

      this.persistCedrifCreditLocally(rif, result);

      this._emisionService.creditLine = result.credit_line;

      this._emisionService.creditLineReason = null;

      this.access.markCreditLineActive(idMember);

      this.mostrarToast('¡Línea de crédito activada con éxito!', 'toast-success');

      setTimeout(() => {

        this.nav.navigate(['/admin/service-orders/pending']);

      }, 1500);

      return;

    }

    if (result.credit_line_reason === 'missing_rif') {

      this.mostrarToast('Indica documento (tipo y número) para Meritop.', 'toast-error');

    } else if (result.credit_line_reason === 'missing_meritop_fields') {

      this.mostrarToast(

        String(result.message || 'Completa email, teléfono y cuenta bancaria.'),

        'toast-error'

      );

    } else {

      this.mostrarToast('No se pudo abrir la línea de crédito. Intenta más tarde.', 'toast-error');

    }

  }



  public async onSubmit() {

    this.showLoading = true;

    try {

      if (!this.emissionForm.valid) {

        this.emissionForm.markAllAsTouched();

        this.showLoading = false;



        const isAccountInvalid = this.emissionForm.get('account_number')?.invalid;

        const isDocIdInvalid = this.emissionForm.get('clientId.docid')?.invalid;

        const isDocTypeInvalid = this.emissionForm.get('clientId.doctype')?.invalid;



        let errorMsg = 'Revisa los campos del formulario.';

        if (isAccountInvalid) {

          errorMsg = '¡El número de cuenta es obligatorio!';

        } else if (isDocIdInvalid || isDocTypeInvalid) {

          errorMsg = '¡El documento de identidad es obligatorio!';

        }



        this.mostrarToast(errorMsg, 'toast-error');

        return;

      }



      const idMember = this.idMember ?? Number(sessionStorage.getItem('id_member') || 0);

      if (!idMember) {

        this.mostrarToast(

          'No se encontró la membresía. Vuelve al panel e intenta de nuevo.',

          'toast-error'

        );

        this.showLoading = false;

        return;

      }



      const rif = this.buildRifFromForm();

      if (!rif) {

        this.mostrarToast('Indica un documento de identidad válido.', 'toast-error');

        this.showLoading = false;

        return;

      }



      const clientId = this.emissionForm.get('clientId') as FormGroup;

      const docPrefix = String(clientId.get('doctype')?.value || '').trim();

      const docIdVal = String(clientId.get('docid')?.value || '').trim();

      const fv = this.emissionForm.value;



      this._arysService

        .validate_credit_line({ rif })

        .pipe(

          switchMap((validation) => {

            const { block, message } = creditLineValidationBlocks(validation);

            if (block) {

              this.mostrarToast(message, 'toast-error');

              this.showLoading = false;

              return EMPTY;

            }

            return this._arysService.retry_credit_line(idMember, {

              rif: docIdVal,

              prefix: docPrefix || 'V',

              name: fv.name,

              last_name: fv.last_name,

              email: fv.email,

              phone_number: fv.phone_number,

              account_number: fv.account_number,

            }).pipe(

              switchMap((result) => {

                if (result?.status !== true) {

                  return of(result);

                }

                return this._arysService.update_membership_cedrif_credit(idMember, { rif }).pipe(

                  switchMap((updateRes) => {

                    if (updateRes?.status === false) {

                      this.mostrarToast(

                        String(

                          updateRes?.message ||

                            'La línea se creó pero no se pudo guardar la cédula en la membresía.'

                        ),

                        'toast-error'

                      );

                      this.showLoading = false;

                      return EMPTY;

                    }

                    return of(result);

                  })

                );

              })

            );

          })

        )

        .subscribe({

          next: (result: any) => {

            this.handleRetryCreditLineResult(result, idMember, rif);

            this.showLoading = false;

          },

          error: (e: HttpErrorResponse) => {

            console.error(e);

            this.mostrarToast('Error de conexión. Intenta más tarde.', 'toast-error');

            this.showLoading = false;

          },

        });

    } catch (e) {

      this.showLoading = false;

      console.error(e);

    }

  }

}


