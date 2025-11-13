import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { AuthService } from 'src/app/shared/services/auth.service';
import { HttpClientModule } from '@angular/common/http';


@Component({
  selector: 'app-restore-password',
  templateUrl: './restore-password.page.html',
  styleUrls: ['./restore-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SpinnerComponent,
    ReactiveFormsModule,
    HttpClientModule
    ],
    providers:[AuthService]
})
export class RestorePasswordPage implements OnInit {

  public showLoading : boolean = false;
  emailUser !: string | any
  formGroup !: FormGroup

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private _authService: AuthService,
    private renderer: Renderer2,
    private navCtrl: Router
  ) {this.generateForm() }

  private generateForm () {
    this.formGroup = this.fb.group({
      email:[''],
      password:['',Validators.required]
    })
  }

  get passwordControl () : AbstractControl<string> {
    return this.formGroup.get('password')!;
  }

  ngOnInit() {
    this.emailUser = this.route.snapshot.paramMap.get('email')
    this.formGroup.get('email')?.patchValue(this.emailUser)
  }

  public async onSubmit() {
    this.showLoading = true
    try{
      if(this.formGroup.valid){
        const data = this.formGroup.value
        this._authService.restore_password(data).subscribe({
          next:(result) => {
            this.mostrarToast('Contraseña actualizada','toast-success')
            setTimeout(() => {
              this.navCtrl.navigate(['/login']);
            }, 4000);
          },error:(error) => {
            this.showLoading = false;
            this.mostrarToast('Correo no existe','toast-error');
            console.error('Error al restablecer contraseña: ', error);
          }
        })
      }else{
        this.showLoading = false;
        this.formGroup.markAllAsTouched()
        this.mostrarToast('Debes completar los campos','toast-error');
      }
    }catch(e){
      console.error(e);
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
