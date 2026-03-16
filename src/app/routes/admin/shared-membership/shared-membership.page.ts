import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { EmissionDetailsService } from '../services/emission-details.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { MeritopService } from '../services/meritop.service';
import { HttpClientModule } from '@angular/common/http';
import { userCreateCustomer } from '../interface/meritop.interface';

@Component({
  selector: 'app-shared-membership',
  templateUrl: './shared-membership.page.html',
  styleUrls: ['./shared-membership.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TabComponent,
    HttpClientModule
    ],
    providers:[MeritopService]
})
export class SharedMembershipPage implements OnInit {
  public  isModalOpen : boolean = false;
  private emission_details = inject(EmissionDetailsService)
  private dataMembership : any 

  get amount(){
    return this.emission_details.planDetails[1].amount.amt;
  }

  get planName() {
    return this.emission_details.planDetails[0].title;
  }

  get numberContrac() {
    return this.emission_details.numberContract.certificado
  }

  get vehiculoBrand(){
    return this.emission_details.data_vehicle.brand
  }

  get vehiculoModel(){
    return this.emission_details.data_vehicle.model
  }

  get vehiculoPlate(){
    return this.emission_details.data_vehicle.plate
  }

  get vehiculoColor(){
    return this.emission_details.data_vehicle.color
  }

  get creditLine(): any {
    return this.emission_details.creditLine;
  }

  get creditLineActive(): boolean {
    return this.emission_details.creditLine?.status === 'active';
  }

  get creditAmount(): number {
    return this.emission_details.creditLine?.credit_amount ?? 0;
  }

  sumarUnAno(): Date {
    const fechaActual = new Date();
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setFullYear(fechaActual.getFullYear() + 1);
    return nuevaFecha;
  }
  

 constructor(
    private renderer: Renderer2,
    private notificationService: NotificationService,
  ) { 

  }


   openModal() {
    this.isModalOpen = true;
    console.log(this.dataMembership)
  }

  closeModal() {
    this.isModalOpen = false;
  }

  private SendDataEmail() : void {
      const templateParams = {
        logo_url:'https://docs.polizaqui.com/logoArys.png',
        to_email: this.emission_details.data_person.email,
        plan: this.emission_details.planDetails[0].title,
        username: this.emission_details.data_person.titular,
        vigencia: this.sumarUnAno(),
        number: this.emission_details.numberContract.certificado,
        owner: {
          name: this.emission_details.data_person.titular,
          dni: this.emission_details.data_person.cedula,
          phone: this.emission_details.data_person.phone,
          email: this.emission_details.data_person.email,
        },
        vehicle: {
          brand:this.emission_details.data_vehicle.brand,
          model: this.emission_details.data_vehicle.model,
          year:this.emission_details.data_vehicle.year,
          plate:this.emission_details.data_vehicle.plate,
          color:this.emission_details.data_vehicle.color,
        },
      }
      this.notificationService.paymentEmail(templateParams)
      console.log(templateParams);
      
  }

  formatBs(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  ngOnInit() {
    this.mostrarToast('Pago confirmado','toast-success')
    this.dataMembership = sessionStorage.getItem('dataMembership')
    this.dataMembership = JSON.parse(this.dataMembership)
    setTimeout(() => {
      this.SendDataEmail()
    }, 3000);
    if (this.creditLineActive) {
      setTimeout(() => {
        this.mostrarToast(`Línea de crédito activada: $${this.creditAmount} USD`, 'toast-success');
      }, 2000);
    }
  }

  public shareByWhatsapp(): void {
    const urlObtenida = this.dataMembership.pdf_url
    const message = [
        '¡Bienvenido a la familia Arys Auto!',
        '',
        'Tu membresía Arys Club ya está activa y ahora formas parte de una comunidad que valora seguridad, beneficios exclusivos y tranquilidad al conducir.',
        '',
        '✅ Descarga tu membresía aquí:',
        urlObtenida,
        '',
        'Gracias por confiar en Arys Auto.',
        'Estamos para acompañarte en cada kilómetro.',
        'Tu seguridad y satisfacción son nuestra prioridad.'
    ].join('\n');
      // const message = `Hola, te comparto el documento de la póliza: ${this.urlDocumentObtenido} y su membresia ${this.urlMembresia}`;
      const encodedMessage = encodeURIComponent(message);
      // window.open(`whatsapp://send?text=${encodedMessage}`, '_blank');
      window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
  }

  public shareByEmail(): void {
      const urlObtenida = this.dataMembership.pdf_url
      const subject = 'Membership Document';
      const body = `Puedes ver el documento de la membresia en el siguiente enlace: ${urlObtenida}`;
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }

    public downloadPolicy(): void {
    const urlObtenida = this.dataMembership.pdf_url
    if (urlObtenida ) {
      this.mostrarToast('Póliza descargada con exito','toast-success')
      setTimeout(() => {
        window.open(urlObtenida, '_blank');
      },3000)
    } else {
      console.error('No hay documento disponible');
    }
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
