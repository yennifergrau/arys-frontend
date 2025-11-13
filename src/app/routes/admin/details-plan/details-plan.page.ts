import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { detailsPlan } from 'src/app/shared/interface/details.interface';
import { NavController } from '@ionic/angular';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-details-plan',
  templateUrl: './details-plan.page.html',
  styleUrls: ['./details-plan.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class DetailsPlanPage implements OnInit {
  emission = inject(EmissionDetailsService);

  public planDetails: detailsPlan[] = [];

  constructor(private navCtrl: NavController) {
    this.requestCameraPermissions();
  }

  ngOnInit() {
    this.planDetails = this.emission.planDetails;
  }

  public nextRouter(): void {
    this.navCtrl.navigateForward([`admin/ocr-preview/data/scan`]);
  }

  navigateBack() {
    this.navCtrl.navigateRoot('/admin/planes/home/user');
  }

  async requestCameraPermissions() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }
}
