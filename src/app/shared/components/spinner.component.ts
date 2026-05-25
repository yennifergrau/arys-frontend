import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template:`
    <div id="preloader">
      <div class="loader">
        <div class="spinner-border text-accent" role="status">
          <span class="visually-hidden">{{ message }}</span>
        </div>
        @if (message) {
          <p class="spinner-message">{{ message }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .loader {
      flex-direction: column;
      gap: 12px;
    }
    .spinner-message {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #2d2d2f;
      text-align: center;
    }
  `,
  standalone: true,
})
export class SpinnerComponent {
  @Input() message = 'Cargando...';
}
