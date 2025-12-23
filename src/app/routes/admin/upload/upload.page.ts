import { AfterViewInit, Component, inject, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SpinnerComponent,
    RouterLink,
    HttpClientModule,
  ],
  providers: [EmissionDetailsService],
})
export class UploadPage implements AfterViewInit {
  public isDisabled: boolean = false;
  public imageUrl: string | null = null;
  public showLoading: boolean = false;
  public pdfUrl: SafeResourceUrl | null = null;
  public isPdf: boolean = false;
  public messageInformation: boolean = false;
  public messageInformationError: boolean = false;
  public scanType: string | null = null;

  private nav = inject(Router);
  private nextService = inject(EmissionDetailsService);

  constructor(
    private domSanitizer: DomSanitizer,
    private renderer: Renderer2
  ) {}

  ngAfterViewInit(): void {
    this.scanType = localStorage.getItem('CURRENT_ADJUNTO');
  }

  // ========================================================
  //   🚀 SIN AWS – SIN OCR – SOLO CARGA Y GUARDA LOCAL
  // ========================================================
  public async handleFileInput(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // 👁‍🗨 Mostrar loading de forma real
    this.showLoading = true;

    // Simulación para que el loader se vea
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.messageInformation = false;
    this.messageInformationError = false;

    if (file.type.startsWith('image/')) {
      this.displayImage(file);
      this.isPdf = false;
    } else if (file.type === 'application/pdf') {
      this.displayPdf(file);
      this.isPdf = true;
    }

    this.saveDocumentAsProcessed();
  }

  // ========================================================
  //        📌 MOSTRAR IMAGEN EN LA PANTALLA
  // ========================================================
  public displayImage(file: Blob) {
    this.messageInformation = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result as string;
      this.saveToNextService(this.imageUrl!);
      this.isDisabled = true;
    };

    reader.readAsDataURL(file);
  }

  // ========================================================
  //        📌 MOSTRAR PDF EN LA PANTALLA
  // ========================================================
  public displayPdf(file: Blob) {
    this.messageInformation = true;

    const blob = new Blob([file], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    this.pdfUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(blobUrl);

    this.saveToNextService(blobUrl);

    this.isDisabled = true;
  }

  // ========================================================
  //    📌 GUARDAR DOCUMENTO EN NEXTSERVICE Y LOCALSTORAGE
  // ========================================================
  private saveToNextService(value: string) {
    switch (this.scanType) {
      case 'carnet':
        this.nextService.carnet = value;
        break;
      case 'licencia':
        this.nextService.licence = value;
        break;
      case 'cedula':
        this.nextService.idCard = value;
        break;
    }
  }

  private saveDocumentAsProcessed() {
    if (!this.scanType) return;

    const safeValue = 'DOCUMENTO_ADJUNTO';

    // Guardar como procesado
    switch (this.scanType) {
      case 'carnet':
        localStorage.setItem('OCR_CARNET', safeValue);
        break;
      case 'licencia':
        localStorage.setItem('OCR_LICENCIA', safeValue);
        break;
      case 'cedula':
        localStorage.setItem('OCR_CEDULA', safeValue);
        break;
    }

    // Ocultar el loader cuando ya terminó todo
    this.showLoading = false;

    // Mostrar confirmación
    this.mostrarToast(' Documento cargado con éxito', 'toast-success');

    // 🔁 Volver al flujo principal
    setTimeout(() => {
      this.nav.navigate(['/admin/ocr-preview/data/scan']).then(() => {window.location.reload()});
    }, 1000);
  }

  // ========================================================
  //                     🔔 SISTEMA DE TOAST
  // ========================================================
  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('upload');
    if (!toastContainer) return;

    toastContainer.innerHTML = '';

    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, estilo);

    const toastContent = this.renderer.createElement('div');
    this.renderer.addClass(toastContent, 'toast-content');

    const icon = this.renderer.createElement('span');
    this.renderer.addClass(icon, 'toast-icon');

    const errorIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
`
    const successIconSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="white" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>;
`
    if (estilo === 'toast-error') {
      this.renderer.setProperty(icon, 'innerHTML', errorIconSVG);
    } else {
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
}