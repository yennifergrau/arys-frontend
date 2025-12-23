import { AfterViewInit, Component, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-image',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterLink,
    SpinnerComponent,
  ],
  providers: [EmissionDetailsService]
})
export class ScanPage implements AfterViewInit {

  public showLoading = false;
  public imageUrl: string | null = null;
  public messageInformation = false;
  public capturedImage: string | null = null;
  public isDisabled = false;
  public scanType: string | null = null;

  private nav = inject(Router);
  private nextService = inject(EmissionDetailsService);

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.scanType = localStorage.getItem('CURRENT_SCAN');
    this.startCamera();
  }

  public async startCamera() {
    const video = document.getElementById('video') as HTMLVideoElement;
    video.setAttribute('playsinline', 'true');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      video.srcObject = stream;
      video.onloadedmetadata = () => video.play();
    } catch (err) {
      console.error('Error al acceder a la cámara:', err);
      this.mostrarToast('Acepta los permisos de la cámara', 'toast-error');
    }
  }

  capturePhoto() {
    this.showLoading = true;
    const video = document.getElementById('video') as HTMLVideoElement;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!video || !ctx) {
      this.showLoading = false;
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    setTimeout(() => {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      this.capturedImage = dataUrl;

      canvas.toBlob((blob: any) => {
        if (blob) {
          this.displayImage(blob);
          this.processImage();
        }

        this.showLoading = false;
      }, 'image/jpeg');
    }, 200);
  }

  /**
   * Eliminado OCR: devolvemos true
   */
  async validateDocumentType(): Promise<boolean> {
    return true;
  }

  public async processImage() {
    const isValid = await this.validateDocumentType();

    if (!isValid) {
      this.mostrarToast('La imagen no coincide', 'toast-error');
      this.capturedImage = null;
      this.startCamera();
      return;
    }

    // 🟢 Guardar en localStorage para que OcrPage lo detecte
    this.saveOCR();

    this.mostrarToast('Imagen procesada con éxito', 'toast-success');

    setTimeout(() => {
      this.nav.navigate(['/admin/ocr-preview/data/scan']).then(() => {
        window.location.reload();
      });
    }, 2500);
  }

  /**
   * 🟢 Guarda la imagen base64 en localStorage usando la clave requerida
   */
  private saveOCR() {
    if (!this.capturedImage || !this.scanType) return;

    switch (this.scanType) {
      case 'licencia':
        localStorage.setItem('OCR_LICENCIA', this.capturedImage);
        break;
      case 'carnet':
        localStorage.setItem('OCR_CARNET', this.capturedImage);
        break;
      case 'cedula':
        localStorage.setItem('OCR_CEDULA', this.capturedImage);
        break;
    }
  }

  displayImage(file: Blob) {
    this.messageInformation = true;
    const reader = new FileReader();
    const scanType = localStorage.getItem('CURRENT_ADJUNTO');

    reader.onload = () => {
      this.imageUrl = reader.result as string;

      switch (scanType) {
        case 'carnet':
          this.nextService.carnet = this.imageUrl;
          break;
        case 'licencia':
          this.nextService.licence = this.imageUrl;
          break;
        case 'cedula':
          this.nextService.idCard = this.imageUrl;
          break;
      }

      this.isDisabled = true;
    };

    reader.readAsDataURL(file);
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('imagen');
    if (!toastContainer) return;

    toastContainer.innerHTML = '';

    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, estilo);

    const toastContent = this.renderer.createElement('div');
    this.renderer.addClass(toastContent, 'toast-content');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'toast-icon');

    const errorIconSVG =`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="white"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
`
    const successIconSVG =`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="white"><path d="M20 6L9 17l-5-5"/></svg>;
`
    this.renderer.setProperty(
      icon,
      'innerHTML',
      estilo === 'toast-error' ? errorIconSVG : successIconSVG
    );

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
}