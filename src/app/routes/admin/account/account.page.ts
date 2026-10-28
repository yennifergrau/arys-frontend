import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { FormatCurrencyPipe } from '../pipes/currency.pipe';
import { DataArysService } from '../services/data-arys.service';
import { MeritopSummaryCacheService } from '../services/meritop-summary-cache.service';
import { EmissionDetailsService } from '../services/emission-details.service';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';
import { SessionService } from 'src/app/shared/services/session.service';
import { environment } from 'src/environments/environment';
import { openWhatsapp } from 'src/app/shared/utils/whatsapp.util';
import {
  certificateFromUserData,
  membershipHasCreditLine,
  membershipMatchesUserCedrif,
  pickActiveMembershipRow,
  resolveMeritopClientIdentity,
  userCedrifFromDecodedToken,
} from '../utils/meritop-identity.util';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
    FormatCurrencyPipe,
  ],
  providers: [DataArysService],
})
export class AccountPage implements OnInit {
  private arysService = inject(DataArysService);
  private meritopCache = inject(MeritopSummaryCacheService);
  private emissionService = inject(EmissionDetailsService);
  private tokenStore = inject(TokenStoreService);
  private session = inject(SessionService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public showLoading = false;
  public fullName = '';
  public email = '';
  public documentId = '';
  public phone = '';
  public vehiclePlate = '';
  public certificate = '';

  public hasCredit = false;
  public debtAmount = 0;
  public activeMembership: any = null;

  // Eliminación de cuenta
  public showDeletePanel = false;
  public deleteProcessing = false;
  public deleteSubmitted = false;
  public deleteReason = '';
  public deleteReference = '';
  public readonly deleteReasons: string[] = [
    'Ya no utilizo el servicio',
    'Vendí mi vehículo',
    'Tengo otra cuenta',
    'Otro motivo',
  ];

  private decodeData: any = {};

  get hasDebt(): boolean {
    return this.debtAmount > 0;
  }

  ngOnInit(): void {
    this.hydrateUserBasicInfo();
    this.hydrateFromCacheAndLoadMembership();
  }

  private hydrateUserBasicInfo(): void {
    const rawToken = this.tokenStore.getAccessTokenSync();
    const decoded: any = rawToken ? jwtDecode(rawToken) : {};
    this.decodeData = decoded;

    const first = String(decoded?.name || '').trim();
    const last = String(decoded?.sub_ape || '').trim();
    this.fullName = [first, last].filter(Boolean).join(' ') || 'Usuario Arys';
    this.email = String(decoded?.email || '').trim();
    this.phone = String(decoded?.phone || decoded?.telefono || '').trim();

    let ud: any = null;
    try {
      const rawUd = localStorage.getItem('userData');
      ud = rawUd ? JSON.parse(rawUd) : null;
    } catch {
      ud = null;
    }

    if (!this.phone && ud) {
      this.phone = String(ud?.phone || ud?.telefono || ud?.celular || '').trim();
    }

    const plateFromUd = String(ud?.plate || ud?.placa || ud?.vehicle_plate || '').trim();
    const plateFromToken = String(decoded?.plate || decoded?.placa || '').trim();
    this.vehiclePlate = plateFromUd || plateFromToken;
    this.certificate = certificateFromUserData() || '';
    this.documentId = this.resolveDocumentString(ud);
  }

  private resolveDocumentString(ud?: any): string {
    const identity = resolveMeritopClientIdentity({
      membershipRow: this.activeMembership,
      accessToken: this.tokenStore.getAccessTokenSync(),
    });
    if (identity && identity.docid) {
      const prefix = (identity.doctype || 'V').toUpperCase();
      return `${prefix}-${identity.docid}`;
    }

    const tokenCedrif = userCedrifFromDecodedToken(this.decodeData);
    if (tokenCedrif) {
      return tokenCedrif.replace(/^([a-zA-Z])(\d+)$/, '$1-$2');
    }

    const docid = String(ud?.cedula || ud?.rif || ud?.docid || '').replace(/\D/g, '');
    const prefix = String(ud?.doctype || ud?.prefix || ud?.letra_rif || 'V').trim().toUpperCase();
    return docid ? `${prefix}-${docid}` : '';
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private hydrateFromCacheAndLoadMembership(): void {
    const cachedMeritop = this.meritopCache.read();
    if (cachedMeritop && this.toNumber(cachedMeritop.limit) > 0) {
      this.hasCredit = true;
      this.debtAmount = Math.max(0, this.toNumber(cachedMeritop.amount_used));
    }

    const stored = sessionStorage.getItem('id_member');
    const idMember = stored
      ? Number(stored)
      : this.decodeData?.id_member != null
        ? Number(this.decodeData.id_member)
        : null;

    this.showLoading = true;
    this.arysService
      .get_membership_for_user({
        id_member: idMember,
        email: this.email || null,
      })
      .subscribe({
        next: (result) => {
          const rows =
            result?.status && Array.isArray(result.data)
              ? result.data.filter((row: any) =>
                  membershipMatchesUserCedrif(row, this.decodeData)
                )
              : [];

          const picked: any = pickActiveMembershipRow(rows, {
            idMember: idMember && !Number.isNaN(idMember) ? idMember : null,
            certificate: this.certificate || null,
          });

          if (picked) {
            this.activeMembership = picked;
            const cert = String(picked['certificate'] ?? picked['certificado'] ?? '').trim();
            if (cert) this.certificate = cert;
            const plate = String(picked['vehicle_plate'] ?? picked['plate'] ?? picked['placa'] ?? '').trim();
            if (plate) this.vehiclePlate = plate;
            this.documentId = this.resolveDocumentString();

            const lineId = membershipHasCreditLine(picked);
            const rowDebt = Math.max(0, this.toNumber(picked['credit_used']));
            if (lineId) this.hasCredit = true;
            if (!cachedMeritop && rowDebt > 0) {
              this.debtAmount = rowDebt;
            }
          }

          this.refreshMeritopDebt();
        },
        error: () => {
          this.refreshMeritopDebt();
        },
      });
  }

  private refreshMeritopDebt(): void {
    const identity = resolveMeritopClientIdentity({
      membershipRows: this.activeMembership ? [this.activeMembership] : undefined,
      accessToken: this.tokenStore.getAccessTokenSync(),
    });
    if (!identity) {
      this.showLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.meritopCache.refreshFromServer$(identity).subscribe({
      next: (product: any) => {
        if (product) {
          this.meritopCache.persistFromProduct(product);
          const limit = this.toNumber(product.limit ?? 0);
          const used = this.toNumber(product.amount_used ?? product.present_debt_amt ?? 0);
          if (limit > 0) {
            this.hasCredit = true;
            this.debtAmount = Math.max(0, used);
          }
        }
        this.showLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  public toggleDeletePanel(): void {
    if (this.deleteProcessing) return;
    this.showDeletePanel = !this.showDeletePanel;
  }

  public selectReason(reason: string): void {
    this.deleteReason = this.deleteReason === reason ? '' : reason;
  }

  public goToPayDebt(): void {
    if (this.activeMembership) {
      this.emissionService.paymentData = {
        ...this.activeMembership,
        credit_used: this.debtAmount,
      };
    }
    void this.router.navigate(['/admin/pagar-deuda']);
  }

  public confirmDeleteAccount(): void {
    if (this.deleteProcessing || this.hasDebt) return;
    this.deleteProcessing = true;
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.deleteReference = `BAJA-${randomSuffix}`;

    this.openSupportWhatsappForDeletion();

    setTimeout(() => {
      this.deleteProcessing = false;
      this.deleteSubmitted = true;
      this.cdr.markForCheck();
    }, 600);
  }

  public openSupportWhatsappForDeletion(): void {
    const rawPhone = environment.contact?.whatsappPhone || '584144128237';
    const supportPhone = rawPhone.replace(/\D/g, '');
    if (supportPhone.length < 10) return;

    const lines = [
      'Hola, buen día. Solicito la eliminación definitiva de mi cuenta en Arys.',
      '',
      `Solicitud: #${this.deleteReference}`,
      this.fullName ? `Titular: ${this.fullName}` : '',
      this.documentId ? `Documento: ${this.documentId}` : '',
      this.email ? `Correo: ${this.email}` : '',
      this.phone ? `Teléfono: ${this.phone}` : '',
      this.certificate ? `Membresía: ${this.certificate}` : '',
      this.vehiclePlate ? `Placa: ${this.vehiclePlate}` : '',
      this.deleteReason ? `Motivo: ${this.deleteReason}` : '',
    ].filter(Boolean);

    const text = lines.join('\n');
    const url = `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`;
    openWhatsapp({ phone: supportPhone, text });
  }

  public finalizeLogout(): void {
    this.session.logout();
  }
}
