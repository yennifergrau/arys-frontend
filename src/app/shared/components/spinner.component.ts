import { Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  template:`
    <div id="preloader">
      <div class="loader">
        <div class="spinner-border text-accent" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `,
  styles:``,
  standalone:true

})
export class SpinnerComponent {
}
