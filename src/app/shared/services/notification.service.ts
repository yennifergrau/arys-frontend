import { Injectable } from '@angular/core';
import emailjs from 'emailjs-com';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor() {}

  public sendEmailPassword(data: any): Promise<any> {
    const templateParams = {
      to_email: data.to_email,
      reset_password_link: data.reset_link,
      user_name:data.user_name,
      logo_url:data.logo_url
    };

    return emailjs.send(
    'service_cghilso',
    'template_xsbri3r',
    templateParams,
    'k_5UFakYBXg08PFDH'
  );
  }

  public welcomeArysService(data: any) {
    const templateParams = {
      username: data.username,
      logo_url: data.logoUrl,
      to_email: data.toEmail,
      reset_password_link: data.reset,
    };
    emailjs
      .send(
        'service_cghilso',
        'template_5g4a73r',
        templateParams,
        'nGInkWSw4blaz1t2j'
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
