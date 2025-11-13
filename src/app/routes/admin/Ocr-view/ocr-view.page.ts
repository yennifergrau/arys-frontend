import { NavController } from '@ionic/angular';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-ocr-view',
  templateUrl: './ocr-view.page.html',
  styleUrls: ['./ocr-view.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
})
export class OcrViewPage implements OnInit {
  public isLicenseScanned: boolean = false;
  public isRegistrationScanned: boolean = false;
  public isInsuranceScanned: boolean = false;
  public isSubmitDisabled: boolean = true;
  public isAllScanned: boolean = false;

  constructor(private navCtrl: NavController) {}
  private checkScannedStatus() {
    this.isLicenseScanned = !!localStorage.getItem('OCR_LICENCIA');
    this.isRegistrationScanned = !!localStorage.getItem('OCR_CARNET');
    this.isInsuranceScanned = !!localStorage.getItem('OCR_CEDULA');
    this.isAllScanned = this.isLicenseScanned && this.isInsuranceScanned;
    this.updateSubmitButtonStatus();
  }

  private updateSubmitButtonStatus() {
    this.isSubmitDisabled = !this.isAllScanned;
  }

  public scanDocument(documentType: string) {
    localStorage.setItem('CURRENT_SCAN', documentType);
    switch (documentType) {
      case 'licencia':
        this.isLicenseScanned = true;
        break;
      case 'carnet':
        this.isRegistrationScanned = true;
        break;
      case 'cedula':
        this.isInsuranceScanned = true;
        break;
    }
    this.checkScannedStatus();
    return this.navCtrl.navigateForward([`/admin/ocr-preview/data/scan/scan`]);
  }

  public scanAdjuntar(documentType: string) {
    localStorage.setItem('CURRENT_ADJUNTO', documentType);

    switch (documentType) {
      case 'licencia':
        this.isLicenseScanned = true;
        break;
      case 'carnet':
        this.isRegistrationScanned = true;
        break;
      case 'cedula':
        this.isInsuranceScanned = true;
        break;
    }

    this.checkScannedStatus();
    this.navCtrl.navigateForward([`/admin/ocr-preview/data/scan/upload`]);
  }

  public sendDocument(): void {
    this.navCtrl.navigateForward([`/admin/emission`]);
  }

  ngOnInit() {
    this.checkScannedStatus();
  }

  navigateBack() {
    this.navCtrl.navigateRoot('/admin/details-plan-selected');
  }
}
