import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-public',
  templateUrl: './public.page.html',
  styleUrls: ['./public.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet, CommonModule, FormsModule]
})
export class PublicPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
