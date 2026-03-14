import { NavController } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  Renderer2,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PaymentService } from '../services/payment.service';
import { EmissionDetailsService } from '../services/emission-details.service';
import { EmissionService } from '../services/emission.service';
import { DataArysService } from '../services/data-arys.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { operationStatuses } from 'src/app/shared/interface/error.interface';

@Component({
  selector: 'app-subscription-payment-otp',
  templateUrl: './subscription-payment-otp.page.html',
  styleUrls: ['./subscription-payment-otp.page.scss'],
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    FormsModule,
    SpinnerComponent,
    RouterLink,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [
    PaymentService,
    EmissionDetailsService,
    EmissionService,
    DataArysService,
  ],
})
export class SubscriptionPaymentOtpPage implements OnInit, AfterViewInit {
  nav = inject(NavController);
  renderer = inject(Renderer2);
  public otpLocked: boolean = false;
  public otp: string[] = [];
  public otpLength: number = 8;
  public isProcessing: boolean = false;
  private idTransaction!: string;
  activatedRoute = inject(ActivatedRoute);
  payment = inject(PaymentService);
  emission_details = inject(EmissionDetailsService);
  emission_service = inject(EmissionService);
  arys_service = inject(DataArysService);
  emission = inject(EmissionService);
  showSpinner: boolean = false;
  otpForm!: FormGroup;
  planDetails!: any;
  paymentData: any;
  id_pay!: any;
  numberContact!: string;
  private countBank: string = '01740126281264340652';
  private codeBank: string = '0174';
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    // this.otpForm = this.formBuilder.group({
    //   digit1: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit2: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit3: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit4: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit5: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit6: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit7: ['', [Validators.required, Validators.maxLength(1)]],
    //   digit8: ['', [Validators.required, Validators.maxLength(1)]],
    // });

    this.planDetails = this.emission_details.planDetails[0];
    this.paymentData = this.emission_details.planDetails[1];
  }

  ngAfterViewInit(): void {
    if (!this.paymentData?.debitor_account?.number) return;
    const storedNumber = this.paymentData.debitor_account.number;
    this.numberContact = this.formatNumber(storedNumber);
  }

  formatNumber(number: string): string {
    if (!number) return '';
    // Eliminar el "0" solo si está al principio y agregar el prefijo +58
    return '+58 ' + number.replace(/^0/, '');
  }

   public moveFocus(event: any, nextInputId: string) {
    if (this.otpLocked) {
      event.preventDefault();
      return;
    }
    const currentInput = event.target as HTMLInputElement;
    const value = currentInput.value;
    if (value.length === 1) {
      const nextInput = document.querySelector(`#${nextInputId}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  public handleBackspace(event: any, currentInputId: string) {
    if (this.otpLocked) {
      event.preventDefault();
      return;
    }
    const currentInput = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && currentInput.value.length === 0) {
      const currentIndex = parseInt(currentInputId.replace('otp', ''), 10) - 1;
      if (currentIndex > 0) {
        const prevInputId = 'otp' + currentIndex;
        const prevInput = document.querySelector(`#${prevInputId}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          this.otp[currentIndex - 1] = '';
        }
      }
    }
  }

  public isOtpComplete(): boolean {
    return this.otp.length === this.otpLength && this.otp.every(value => value !== '');
  }

    private handleError(message: string) {
    this.mostrarToast(message, 'toast-error');
    this.showSpinner = false;
  }


  private generateSubscriptions(): void {
    try {
      const vehicleId = this.emission_details.vehicleId;
      const personaId = this.emission_details.personId;
      const tipoMembresia = this.emission_details.planDetails[0].id;
      this.emission
        .startCotizador(Number(vehicleId), tipoMembresia)
        .subscribe((res: any) => {
      console.log(res)
          this.emission
            .registerSubscription(
              res,
              Number(vehicleId),
              Number(personaId),
              tipoMembresia
            )
            .subscribe(
              (res: any) => {
                if (res) {
      console.log(res)
                  console.log(res);
                  this.emission_details.numberContract = res;
                  this.membership(res.certificado, res.urlPDF);
                  this.mostrarToast('Subscripcion con exito', 'toast-success');
                  setTimeout(() => {
                    this.nav.navigateRoot(
                      '/admin/shared/membership/user/sarys'
                    );
                  }, 4000);
                }
              },
              (error) => {
                console.error('Error al registrar la suscripción:', error);
                this.mostrarToast(
                  'Error al registrar la suscripción',
                  'toast-error'
                );
                this.showSpinner = false;
              }
            );
        });
    } catch (e) {
      console.error(e);
    }
  }

  // onOtpInput(event: any, index: number) {
  //   const input = event.target;
  //   const value = input.value;

  //   if (value.length > 1) {
  //     input.value = value.charAt(0);
  //   }

  //   if (value && index < this.otpInputs.length - 1) {
  //     const nextInput = this.otpInputs.get(index + 1);
  //     if (nextInput) {
  //       nextInput.nativeElement.focus();
  //     }
  //   } else if (!value && index > 0) {
  //     const prevInput = this.otpInputs.get(index - 1);
  //     if (prevInput) {
  //       prevInput.nativeElement.focus();
  //     }
  //   }
  // }

  private paymentDataArys(transaction_id: any) {
    try {
      const data = {
        bank_code:
          this.emission_details.planDetails[1].creditor_account.bank_code,
        amount: this.emission_details.planDetails[1].amount.amt,
        prefix: this.emission_details.planDetails[1].debitor_document_info.type,
        rif: this.emission_details.planDetails[1].debitor_document_info.number,
        phone_bank: this.emission_details.planDetails[1].debitor_account.number,
        bank_acc: this.emission_details.planDetails[1].debitor_account.number,
        reference: transaction_id,
      };
      console.log(data)
      this.arys_service.add_payment(data).subscribe({
        next: (result) => {
          console.log(result);
          this.id_pay = result.id_pay;
        },
        error: (error) => {
          console.log(error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }
    public async resendOtp() {
  try {
    this.showSpinner = true;
    // Reutilizamos los datos de pago que ya tenemos almacenados
    console.log(this.paymentData)
    const paymentData = this.paymentData;

    console.log(paymentData)
    // Generamos un nuevo token y solicitamos un nuevo OTP
    const authToken = await this.payment.authToken().toPromise();
    const response = await this.payment.realizarPago(paymentData).toPromise();
    
    this.mostrarToast('Nuevo código enviado con éxito', 'toast-success');
    this.clearOtp(); // Limpiamos los campos OTP
    this.showSpinner = false;
  } catch (error) {
    console.log('Error al enviar nuevo codigo', error)
    this.mostrarToast('Error al enviar nuevo código. Intente nuevamente.', 'toast-error');
    this.showSpinner = false;
  }
}

  public clearOtp() {
    this.otp = Array(this.otpLength).fill('');
  }

  // private sendDocument(
  //   id_persona: number,
  //   documento1: string,
  //   id_documento_proceso: number,
  //   img_documento: string,
  //   fec_vencimiento: string
  // ) {
  //   const data = {
  //     documento1,
  //     id_documento_proceso,
  //     id_persona,
  //     img_documento,
  //     fec_vencimiento,
  //     fec_entrega: new Date().toString(),
  //     tipo_ext: '',
  //     observacion: '',
  //   };
  //   this.emission.sendDocumentUser(data).subscribe({
  //     next: (res) => console.log(res),
  //     error: (e) => console.error(e),
  //   });
  // }

  private membership(certificate: any, urlPDF: any) {
    const decode: any = sessionStorage.getItem('accessToken');
    console.log(decode)
    const decodeToken: any = jwtDecode(decode);
    console.log(decodeToken)
    try {
      const data = {
        id_pay: this.id_pay,
        id_veh: this.emission_details.vehicle_id_arys,
        id_payer: this.emission_details.id_person_arys,
        certificate: certificate,
        pdf_url: urlPDF,
        id_user: decodeToken.id_user,
        name: this.emission_details.planDetails[0].title,
        membership_type: this.emission_details.planDetails[0].id === 'moto' ? 'moto' : 'auto',
      };
      console.log(data)
      this.arys_service.add_membership(data).subscribe({
        next: (result) => {
          console.log(result);
          sessionStorage.setItem('resultMembership', JSON.stringify(result))
          sessionStorage.setItem('dataMembership', JSON.stringify(data))
        },
        error: (error) => {
          console.log(error);
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  getDescription(code: string): string {
    const status = operationStatuses.find(s => s.code === code);
    return status ? status.description : "Código desconocido";
  }

  onSubmit() {


      if (this.isProcessing) {
        console.log('entro aca')
        this.showSpinner = true;
        this.getNotificationPayment();
      return;
    }
      this.showSpinner = true;

      const otpCode = this.otp.join('').trim();
      if(otpCode.length  !== this.otpLength){
        console.log(`El código OTP debe tener exactamente ${this.otpLength} dígitos.`)
        alert(`El código OTP debe tener exactamente ${this.otpLength} dígitos.`);
        this.showSpinner = false;
        return;
      }
      
      
    
      const datos = {
        internal_id: '0000001800',
        group_id: '',
        account: {
          bank_code: this.codeBank,
          type: 'CNTA',
          number: this.countBank,
        },
        amount: {
          amt: this.paymentData.amount.amt,
          currency: 'VES',
        },
        concept: 'Cobro de Poliza',
        notification_urls: {
          web_hook_endpoint:
            'https://syPagoMundial.polizaqui.com/getNotifications',
        },
        receiving_user: {
          otp: otpCode,
          document_info: {
            type: this.paymentData.debitor_document_info.type,
            number: this.paymentData.debitor_document_info.number,
          },
          account: {
            bank_code: this.paymentData.debitor_account.bank_code,
            type: this.paymentData.debitor_account.type,
            number: this.paymentData.debitor_account.number,
          },
        },
      };
      // const token = "x8HZtVt2cv89o-qfeWCGbucQMONbC03GAOg0VI0ivag"
      this.payment.verifyCodeOTP(datos).subscribe({
        next: (response: any) => {
          sessionStorage.setItem('transactionId', response.transaction_id);
          this.idTransaction = response.transaction_id
          console.log('OTP verification response:', this.idTransaction);
          this.getNotificationPayment()
        },
        error: (error) => {
          console.error('Error recibido del backend SyPago:', error);

          // Obtener el mensaje de error especifico del backend de Sypago
          const backendMessage = error?.error?.message || 'Hubo un error al procesar el OTP.';
          console.log('Mensaje de error del backend de Sypago:', backendMessage);
          const backendCode = error?.error?.code 
          ? `(Código ${error.error.code})`
          : '';

          // Mostar mensaje real al usuario
          this.mostrarToast(`${backendMessage}${backendCode}`, 'toast-error');
          this.showSpinner = false;
          console.error('OTP verification error:', error);
          this.otpForm.reset();
        },
      });
    
  }

  navigateBack() {
    this.nav.back();
  }

  sumarUnAno(): Date {
    const fechaActual = new Date();
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setFullYear(fechaActual.getFullYear() + 1);
    return nuevaFecha;
  }

  public getNotificationPayment(){
    const id = { id_transaction: this.idTransaction };
    const interval = setInterval(() => {
      this.payment.getNotification(id).subscribe({
         next: async (data:any) => {
          console.log(data)
          const status = data?.data?.status;
          // const status: any = 'ACCP';

          if (!status) {
            this.handleError('Estado no definido en la respuesta');
            clearInterval(interval);
            return;
          }

          switch (status) {
            case 'ACCP':
              this.paymentDataArys(this.idTransaction);
              this.generateSubscriptions();
              this.mostrarToast('Pago confirmado', 'toast-success');
              clearInterval(interval);
              break;
            case 'RJCT':
              const code = data?.data?.rejected_code || 'Código desconocido';
              console.log(`La operación fue rechazada: ${this.getDescription(code)}`)
              this.mostrarToast(`La operación fue rechazada: ${this.getDescription(code)}`, 'toast-error');
              this.showSpinner = false;
              this.isProcessing = false;
              this.otpLocked = false;
              sessionStorage.removeItem('transactionId');
              clearInterval(interval);
              break;
            case 'PEND':
            case 'PROC':
              const codePend = data?.data || 'Código desconocido';
              console.log(codePend)
              console.log(`La operación aún está en proceso: ${this.getDescription(codePend)}`);
              this.mostrarToast('⚠️ El pago está diferido. Vuelva a dar clic en "Verificar y procesar', 'toast-success');
              this.isProcessing = true;
              this.otpLocked = true;
              console.log("ID de la transaccion con status PEND o PROC", this.idTransaction)
              this.showSpinner = false;
              clearInterval(interval);
              break;
            default:
              this.showSpinner = false;
              this.mostrarToast(
                'Estado de la operación desconocido. Contacte soporte.',
                'toast-error'
              );
              clearInterval(interval);
              break;
                }
         },
        error: (err) => {
          console.error('Error en la petición de notificación:', err);

            // ✅ Mostrar mensaje real del backend si existe
            const backendMessage =
              err?.error?.message || 'Error al consultar la notificación de pago.';
            const backendCode = err?.error?.code
              ? ` (Código ${err.error.code})`
              : '';

            this.mostrarToast(`${backendMessage}${backendCode}`, 'toast-error');
        },
      });
    }, 3000);
  }
  

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-paymentOTP');
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
