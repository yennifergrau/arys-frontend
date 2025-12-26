import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { AwsService } from 'src/app/shared/services/aws.service';
import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';
import { SafeResourceUrl  } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { DomSanitizer } from '@angular/platform-browser';
import { catchError, throwError } from 'rxjs';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    SpinnerComponent,
    RouterLink,
  ],
  providers: [AwsService],
})
export class UploadPage implements OnInit {
  public isDisabled: boolean = false;
  public imageUrl: string | null = null;
  public showLoading: boolean = false;
  public text!: string;
  public pdfUrl: SafeResourceUrl | null = null;
  private textractClient: TextractClient;
  public isPdf: boolean = false;
  public messageInformation: boolean = false;
  public messageInformationError: boolean = false;
  encryptedData: string | any;

  constructor(
    private domSanitizer: DomSanitizer,
    private ocrService: AwsService,
    private navCtrl: Router,
    private renderer: Renderer2,
    private emission: EmissionDetailsService
  ) {
    this.textractClient = new TextractClient({
      region: environment.awsConfig.region,
      credentials: {
        accessKeyId: environment.awsConfig.credentials.accessKeyId,
        secretAccessKey: environment.awsConfig.credentials.secretAccessKey,
      },
    });
  }

  ngOnInit(): void {}

  public processDocumentText(text: any) {
    const currentScanType = localStorage.getItem('CURRENT_ADJUNTO');
    if (currentScanType && text) {
      const jsonString = JSON.stringify(text);
      if (currentScanType === 'licencia') {
        localStorage.setItem('OCR_LICENCIA', jsonString);
      } else if (currentScanType === 'carnet') {
        localStorage.setItem('OCR_CARNET', jsonString);
      } else if (currentScanType === 'cedula') {
        localStorage.setItem('OCR_CEDULA', jsonString);
      }
      this.mostrarToast(' Documento procesado con éxito', 'toast-success');
      setTimeout(() => {
        setTimeout(() => {
          this.navCtrl.navigate([`/admin/ocr-preview/data/scan`]).then(() => {
            window.location.reload();
          });
        }, 3000);
      }, 2500);
    } else {
      this.handleValidationError(currentScanType);
    }
  }

  public validateJsonFields(jsonObject: any): boolean {
    for (const key in jsonObject) {
      if (jsonObject.hasOwnProperty(key) && !jsonObject[key]) {
        return false;
      }
    }
    return true;
  }

  public async handleValidationError(scanType: string | null) {
    await this.mostrarToast(' No se pudo procesar la imagen', 'toast-error');

    if (scanType) {
      switch (scanType) {
        case 'carnet':
          localStorage.removeItem('OCR_CARNET');
          break;
        case 'licencia':
          localStorage.removeItem('OCR_LICENCIA');
          break;
        case 'cedula':
          localStorage.removeItem('OCR_CEDULA');
          break;
      }
      setTimeout(() => {
        window.location.reload();
      }, 2800);
    }
  }

  public async performOcr(file: Blob): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const command = new DetectDocumentTextCommand({
        Document: { Bytes: uint8Array },
      });
      const response = await this.textractClient.send(command);
      const text =
        response.Blocks?.filter((block) => block.BlockType === 'LINE')
          .map((block) => block.Text)
          .join(' ') || '';

      return this.cleanText(text);
    } catch (error) {
      console.log('Error en performOcr')
      console.log(error)
      throw new Error(
        'Se produjo un error al procesar la imagen. Por favor, intente nuevamente.'
      );
    }
  }

  public cleanText(text: string): string {
    return text.replace(/\s+/g, '').trim();
  }

  public async validateDocumentType(
    file: Blob,
    currentScanType: string | null
  ): Promise<boolean> {
    if (!currentScanType) {
      return false;
    }

    const text = await this.performOcr(file);

    if (currentScanType === 'licencia') {
      return /LICENCIA/.test(text) || /Licencia/.test(text);
    } else if (currentScanType === 'cedula') {
      return /VENEZOLANO/.test(text);
    } else if (currentScanType === 'carnet') {
      return /CERTIFICADO/.test(text) || /Certificado/.test(text);
    }

    return false;
  }

  public async processImage(file: Blob) {
    const currentScanType = localStorage.getItem('CURRENT_ADJUNTO');
    this.showLoading = true;
    const isValid = await this.validateDocumentType(file, currentScanType);
    if (!isValid) {
      this.showLoading = false;
      this.messageInformationError = true;
      this.messageInformation = false;
      this.mostrarToast(' La imagen no coincide', 'toast-error');
      return;
    }
    this.ocrService
      .fileUpload(file)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          this.showLoading = false;
          if (error.status === 400) {
            this.mostrarToast(' El documento no es valido', 'toast-error');
            this.clearPreviousData();
          } else {
            this.mostrarToast(
              ' Ocurrio un error intenta de nuevo',
              'toast-error'
            );
            this.clearPreviousData();
          }
          return throwError(error);
        })
      )
      .subscribe((response: any) => {
        this.text = response;
        this.processDocumentText(this.text);
      });
  }

  public clearPreviousData() {
    this.text = '';
  }

  public async handleFileInput(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        this.displayImage(file);
        this.isPdf = false;
      } else if (file.type === 'application/pdf') {
        this.displayPdf(file);
        this.isPdf = true;
      }
      this.processImage(file);
    }
  }

  public displayImage(file: Blob) {
    this.messageInformation = true;
    this.messageInformationError = false;
    const reader = new FileReader();
    const scanType = localStorage.getItem('CURRENT_ADJUNTO');
    reader.onload = () => {
      this.imageUrl = reader.result as string;
      switch (scanType) {
        case 'carnet':
          this.emission.carnet = this.imageUrl;
          break;
        case 'licencia':
          this.emission.licence = this.imageUrl;
          break;
        case 'cedula':
          this.emission.idCard = this.imageUrl;
          break;
      }
      this.isDisabled = true;
    };
    reader.readAsDataURL(file);
  }

  public displayPdf(file: Blob) {
    if (!file || file.size === 0) {
      console.error('El archivo PDF está vacío o no es válido.');
      return;
    }
    this.messageInformation = true;
    this.messageInformationError = false;
    const blob = new Blob([file], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    this.pdfUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(blobUrl);
    this.isDisabled = true;
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
    }, 5000);
  }
}
