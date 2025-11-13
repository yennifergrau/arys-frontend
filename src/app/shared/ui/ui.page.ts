import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ui',
  templateUrl: './ui.page.html',
  styleUrls: ['./ui.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class UiPage  {

}
