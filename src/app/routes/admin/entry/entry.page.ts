import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { jwtDecode } from 'jwt-decode';
import { firstValueFrom } from 'rxjs';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { DataArysService } from '../services/data-arys.service';
import { ServiceOrderService } from '../services/service-order.service';
import { EmissionDetailsService } from '../services/emission-details.service';
import { membershipHasCreditLine, pickActiveMembershipRow } from '../utils/meritop-identity.util';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';

@Component({
  selector: 'app-entry',
  templateUrl: './entry.page.html',
  styleUrls: ['./entry.page.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule, SpinnerComponent, TabComponent],
  providers: [DataArysService, ServiceOrderService],
})
export class EntryPage implements OnInit {
  private readonly arys = inject(DataArysService);
  private readonly serviceOrders = inject(ServiceOrderService);
  private readonly emissionDetails = inject(EmissionDetailsService);
  private readonly tokenStore = inject(TokenStoreService);

  public showLoading = false;
  public username = '';
  public membership: any | null = null;
  public hasCreditLine = false;
  public hasPendingOrder = false;

  constructor(
    private readonly navCtrl: NavController,
    private readonly router: Router,
    private readonly renderer: Renderer2
  ) {}

  private getIdentityFromToken(): { email?: string; id_member?: number; name?: string } | null {
    const token = this.tokenStore.getAccessTokenSync();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return {
        email: decoded?.email != null ? String(decoded.email) : undefined,
        id_member: decoded?.id_member != null ? Number(decoded.id_member) : undefined,
        name:
          [decoded?.name, decoded?.sub_ape]
            .filter((x: any) => x != null && String(x).trim() !== '')
            .map((x: any) => String(x).trim())
            .join(' ') || undefined,
      };
    } catch {
      return null;
    }
  }

  private async loadMembership(): Promise<any | null> {
    const tokenInfo = this.getIdentityFromToken();
    if (tokenInfo?.name) this.username = tokenInfo.name;

    const stored = sessionStorage.getItem('id_member');
    const idMember =
      stored != null && String(stored).trim() !== ''
        ? Number(stored)
        : tokenInfo?.id_member != null
          ? Number(tokenInfo.id_member)
          : null;

    try {
      const res =
        idMember != null && !Number.isNaN(idMember) && idMember > 0
          ? await firstValueFrom(this.arys.get_membership(idMember))
          : tokenInfo?.email
            ? await firstValueFrom(this.arys.get_membership_by_email(String(tokenInfo.email)))
            : null;

      const rows = res?.status && Array.isArray(res.data) ? res.data : (res?.data ? [res.data] : []);
      const storedId = stored != null && String(stored).trim() !== '' ? Number(stored) : null;
      const picked = pickActiveMembershipRow(rows, {
        idMember: storedId != null && !Number.isNaN(storedId) && storedId > 0 ? storedId : idMember,
      });
      if (picked?.['id_master'] != null) {
        sessionStorage.setItem('id_member', String(picked['id_master']));
      }
      return picked;
    } catch {
      return null;
    }
  }

  private async checkPendingOrders(): Promise<boolean> {
    const stored = sessionStorage.getItem('id_member');
    const membershipId = stored ? Number(stored) : NaN;
    if (Number.isNaN(membershipId) || membershipId <= 0) return false;

    try {
      const res: any = await firstValueFrom(this.serviceOrders.getPendingOrders(membershipId));
      const list = res?.status && Array.isArray(res.data) ? res.data : [];
      return list.length > 0;
    } catch {
      return false;
    }
  }

  public goRequestService() {
    this.router.navigate(['/admin/commerce/sarys/data']);
  }

  public goOpenCreditLine() {
    this.router.navigate(['/admin/Customer/create/sarys/meritop'], {
      queryParams: this.membership?.id_master != null ? { id: this.membership.id_master } : undefined,
    });
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-entry');
    if (!toastContainer) return;

    toastContainer.innerHTML = '';
    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, estilo);

    const toastContent = this.renderer.createElement('div');
    this.renderer.addClass(toastContent, 'toast-content');
    const text = this.renderer.createElement('span');
    this.renderer.setProperty(text, 'innerHTML', mensaje);
    this.renderer.appendChild(toastContent, text);
    this.renderer.appendChild(toast, toastContent);
    this.renderer.appendChild(toastContainer, toast);

    setTimeout(() => {
      this.renderer.removeChild(toastContainer, toast);
    }, 4500);
  }

  async ngOnInit() {
    this.showLoading = true;

    this.membership = await this.loadMembership();
    if (this.membership) {
      this.emissionDetails.mergeUserDataFromMembership(this.membership);
    }
    if (!this.membership) {
      this.showLoading = false;
      this.navCtrl.navigateRoot(['/admin/planes/home/user']);
      return;
    }

    this.hasCreditLine = membershipHasCreditLine(this.membership);

    this.hasPendingOrder = await this.checkPendingOrders();
    if (this.hasPendingOrder) {
      this.showLoading = false;
      this.navCtrl.navigateRoot(['/admin/service-orders/pending']);
      return;
    }

    this.showLoading = false;
  }
}

