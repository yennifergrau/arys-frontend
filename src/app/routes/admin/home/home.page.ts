import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { NavController } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { EmissionDetailsService } from '../services/emission-details.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class HomePage implements OnInit {
  emission = inject(EmissionDetailsService);
  public readonly detail_basico = [
    {
      id: 1,
      title: 'Club básico',
      price: '17/año',
      priceI: 17,
      data: [
        {
          sub_title: 'Asistencia 24/7 en Todo el País',
          information: 'Soporte inmediato, estés donde estés.',
        },
        {
          sub_title: 'Acompañamiento en Incidentes',
          information: 'Seguridad y tranquilidad en cada viaje.',
        },
        {
          sub_title: 'Red de Talleres con Descuentos',
          information: 'Reparaciones certificadas a precios preferenciales.',
        },
        {
          sub_title: 'Asesoría Legal',
          information: 'Apoyo en temas de tránsito y accidentes.',
        },
      ],
    },
  ];

  public readonly deatails_carga = [
    {
      id: 5,
      title: 'Club Carga',
      price: '35/año',
      priceI: 35,
      data: [
        {
          sub_title: 'Asistencia en Carretera',
          information: 'Seguridad y ayuda inmediata en cualquier momento.',
        },
        {
          sub_title: 'Orientación Legal',
          information: 'Apoyo experto en situaciones de tránsito.',
        },
        {
          sub_title: 'Descuentos en Talleres',
          information: 'Ahorros en servicios de reparación certificados.',
        },
        {
          sub_title: 'Acceso a Grúas',
          information: 'Tarifas preferenciales en emergencias.',
        },
      ],
    },
  ];

  public readonly details_moto = [
    {
      id: 4,
      title: 'Club Motos',
      price: '15/año',
      priceI: 15,
      data: [
        {
          sub_title: 'Asistencia 24/7',
          information: 'Respuesta inmediata en todo momento.',
        },
        {
          sub_title: 'Asesoría Legal',
          information: 'Apoyo legal en situaciones de tránsito',
        },
        {
          sub_title: 'Descuentos en Talleres',
          information: 'Ahorros en mantenimiento certificado',
        },
        {
          sub_title: 'Asistencia Vial',
          information: 'Soporte en incidentes menores.',
        },
      ],
    },
  ];

  public readonly detail_diamond = [
    {
      id: 3,
      title: 'Club Diamante',
      price: '105/año',
      priceI: 105,
      data: [
        {
          sub_title: 'Asistencia 24/7',
          information:
            'Protección ininterrumpida para que siempre te sientas seguro.',
        },
        {
          sub_title: 'Acompañamiento en Emergencias',
          information:
            'Tranquilidad en cada llamada durante momentos difíciles.',
        },
        {
          sub_title: 'Asesoría Legal',
          information: 'Defiende tus derechos con nuestra guía experta',
        },
        {
          sub_title: 'Talleres Certificados',
          information:
            'Confianza en las mejores reparaciones para tu vehículo.',
        },
      ],
    },
  ];

  public readonly detail_gold = [
    {
      id: 2,
      title: 'Club Gold',
      price: '55/año',
      priceI: 55,
      data: [
        {
          sub_title: 'Atención 24/7',
          information:
            'Tranquilidad total con soporte constante, estés donde estés',
        },
        {
          sub_title: 'Asesoría Legal Rápida',
          information: 'Apoyo en incidentes y problemas de tránsito.',
        },
        {
          sub_title: 'Descuentos en Talleres',
          information: 'Precios preferenciales para reparaciones certificadas.',
        },
        {
          sub_title: 'Descuentos en Talleres',
          information: 'Precios preferenciales para reparaciones certificadas.',
        },
        {
          sub_title: 'Servicio de Grúa',
          information: 'Hasta 150 km sin costo, para tu tranquilidad',
        },
      ],
    },
  ];

  constructor(private navCtrl: NavController) {}

  ngOnInit() {}

  public onSubmit(plan: any) {
    this.emission.planDetails = plan;
    this.navCtrl.navigateForward([`admin/details-plan-selected`]);
  }

  navigateBack() {
    this.navCtrl.back();
  }
}
