import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavController } from '@ionic/angular';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { DataArysService } from '../services/data-arys.service';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { TokenStoreService } from 'src/app/shared/services/token-store.service';
import { membershipMatchesUserCedrif } from '../utils/meritop-identity.util';
import { MembershipSessionService } from '../services/membership-session.service';

@Component({
  selector: 'app-membresias',
  templateUrl: './membresias.page.html',
  styleUrls: ['./membresias.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    HttpClientModule,
    SpinnerComponent,
  ],
  providers: [DataArysService],
})
export class MembresiasPage implements OnInit {
  private arys_service = inject(DataArysService);
  private tokenStore = inject(TokenStoreService);
  private membershipSession = inject(MembershipSessionService);
  private navCtrl = inject(NavController);

  private membershipId: number | null = null;
  private userEmail: string | null = null;
  private decodeToken: Record<string, unknown> = {};
  public data_membership: any[] = [];
  public activeId: number | null = null;
  public switchingId: number | null = null;
  public showLoading = false;

  constructor() {
    this.showLoading = true;
    const decode: any = this.tokenStore.getAccessTokenSync();
    this.decodeToken = decode ? jwtDecode(decode) : {};
    const stored = sessionStorage.getItem('id_member');
    this.membershipId = stored
      ? Number(stored)
      : this.decodeToken['id_member'] != null
        ? Number(this.decodeToken['id_member'])
        : null;
    this.userEmail = this.decodeToken['email'] ? String(this.decodeToken['email']) : null;
    this.activeId = this.membershipSession.getActiveId();
  }

  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  public isActive(row: any): boolean {
    return this.membershipSession.isActive(row);
  }

  public downloadPolicy(pdf_url: any): void {
    const urlObtenida = pdf_url;
    if (urlObtenida) {
      window.open(urlObtenida, '_blank');
    } else {
      console.error('No hay documento disponible');
    }
  }

  public usarMembresia(row: any): void {
    if (!row?.id_master || this.isActive(row) || this.switchingId != null) return;
    this.switchingId = Number(row.id_master);
    this.membershipSession.activate(row);
    this.activeId = this.membershipSession.getActiveId();
    void this.navCtrl.navigateRoot(['/admin/dashboard/sarys']);
  }

  private getMembership() {
    try {
      this.arys_service
        .get_membership_for_user({
          id_member: this.membershipId,
          email: this.userEmail,
        })
        .subscribe({
          next: (result) => {
            const rows =
              result?.status && Array.isArray(result.data)
                ? result.data.filter((row: any) =>
                    membershipMatchesUserCedrif(row, this.decodeToken)
                  )
                : [];
            this.data_membership = rows;
            this.membershipSession.rememberAvailableCount(rows.length);
            this.activeId = this.membershipSession.getActiveId();
            this.showLoading = false;
          },
          error: (error) => {
            this.data_membership = [];
            this.showLoading = false;
            console.log(error);
          },
        });
    } catch (e) {
      console.error(e);
      this.showLoading = false;
    }
  }

  ngOnInit() {
    this.getMembership();
  }
}
