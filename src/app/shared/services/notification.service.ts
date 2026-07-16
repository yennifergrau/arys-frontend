import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor() {}

  public sendEmailPassword(data: any): Promise<any> {
    const templateParams = {
      to_email: data.to_email,
      reset_password_link: data.reset_link,
      user_name: data.user_name,
      logo_url: data.logo_url,
      download_app_link: environment.downloadMobileAppLink,
    };

    return emailjs.send(
      'service_cghilso',
      'template_xsbri3r',
      templateParams,
      'k_5UFakYBXg08PFDH'
    );
  }

  /** Bienvenida al crear cuenta — mismo payload que Arys-Poliza (`CREACION_CLIENTE_APP`). */
  public welcomeArysService(data: any) {
    const username = data?.nombre || data?.username || 'Usuario';
    const email = data?.email || data?.toEmail || '';
    const logoUrl = data?.logo_url || data?.logoUrl || 'https://docs.polizaqui.com/logoArys.png';
    const appHomeUrl = environment.url_app_ventas || 'https://arys.polizaqui.com';

    const templateParams = {
      asunto: '¡Tu cuenta ARYS Auto ha sido creada con éxito!',
      titulo_principal: '¡BIENVENIDO A ARYS!',
      username,
      mensaje_introduccion:
        'Te confirmamos que tu cuenta ha sido creada exitosamente. ¡Estamos listos para acompañarte en cada kilómetro! 🚀',
      bloque_detalles: '',
      texto_boton: '¡Explorar ahora!',
      reset_password_link: appHomeUrl,
      to_email: email,
      logo_url: logoUrl,
      download_app_link: environment.downloadMobileAppLink,
    };

    emailjs
      .send(
        'service_cghilso',
        'template_5g4a73r',
        templateParams,
        'k_5UFakYBXg08PFDH'
      )
      .then(
        (response) => {
          console.log('¡Correo enviado exitosamente!', response);
        },
        (err) => {
          console.log('fallo al enviar el correo', err);
        }
      );
  }

  public paymentEmail(data: any) {
    const templateParams = {
      logo_url: data.logo_url,
      to_email: data.to_email,
      plan: data.plan,
      vigencia: data.vigencia,
      number: data.number,
      username: data.username,
      owner: {
        name: data.owner.name,
        dni: data.owner.dni,
        phone: data.owner.phone,
        email: data.owner.email,
      },
      vehicle: {
        brand: data.vehicle.brand,
        model: data.vehicle.model,
        year: data.vehicle.year,
        plate: data.vehicle.plate,
        color: data.vehicle.color,
      },
    };
    emailjs
      .send(
        'service_cghilso',
        'template_wkrquo6',
        templateParams,
        'k_5UFakYBXg08PFDH'
      )
      .then(
        (response) => {
          console.log('¡Correo enviado exitosamente!', response);
        },
        (err) => {
          console.log('fallo al enviar el correo', err);
        }
      );
  }
}
