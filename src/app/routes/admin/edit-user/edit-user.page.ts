import { Component, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AuthService } from 'src/app/shared/services/auth.service';
import {jwtDecode} from 'jwt-decode'
import { edit_profile } from '../interface/arys.interface';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-edit-user',
  templateUrl: './edit-user.page.html',
  styleUrls: ['./edit-user.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HttpClientModule,
    ReactiveFormsModule,
    SpinnerComponent,
    NgxMaskDirective,
    ],
    providers:[AuthService,provideNgxMask()]
})
export class EditUserPage implements OnInit {

  formEdit !: FormGroup
  information_use : edit_profile[] = []
  public showLoading : boolean = false;
  fullName !: string
  id_user !: number

  constructor(
    private fb : FormBuilder,
    private renderer :  Renderer2,
    private router : Router,
    private _authService : AuthService
  ) { 
    this.showLoading = true;
    this.generateForm()
    this.decodeToken()
  

  }

  private generateForm () {
    this.formEdit = this.fb.group({
      id_user: new FormControl(''),
      name : new FormControl(''),
      sub_ape: new FormControl(''),
      phone: new FormControl(''),
      email: new FormControl('')
    })
  }

  private decodeToken() {
    this.showLoading = true;
    const data_token = sessionStorage.getItem('accessToken')
    if(data_token){
      const decode_data : any = jwtDecode(data_token)
      this.information_use = decode_data
      const data : any = this.information_use
      if(this.information_use){
 
        this.id_user = data.id_user
        console.log(this.id_user);
        
      }
    }
  }


  private getInfoUser() {
    const data = {
      id_user: this.id_user
    }
    try {
      this._authService.view_user_info(data).subscribe({
        next: (result) => {
          console.log(result)
          if (result && result.user) {
            const usuario = result.user
            if (usuario) {
              this.fullName = (`${usuario.name} ${usuario.sub_ape}`).toUpperCase();
              let telefono = usuario.phone
              telefono = telefono.replace(/^0/, '').replace(/-/g, '')
              this.formEdit.patchValue({
                name: usuario.name,
                sub_ape: usuario.sub_ape,
                phone: telefono,
                email: usuario.email,
                id_user: usuario.id_user
              })
              this.showLoading = false;
            } else {
              this.showLoading = false;
              this.mostrarToast('Usuario no encontrado','toast-error')
            }
          } else {
            console.error("La respuesta del servicio no tiene la estructura esperada.");
          }
        },
        error: (error) => {
          console.error("Error en la suscripción:", error);
        }
      }); 
    } catch (e) {
      console.error(e);
    }
  }
  
  

  public async onSubmit() {
    this.showLoading = true
    try{
      if(this.formEdit.dirty){
        const data = this.formEdit.value
        this._authService.edit_user_info(data).subscribe({
          next:(result) => {
            this.mostrarToast(`Usuario ${this.fullName } editado con exito`,'toast-success');
            setTimeout(() => {
              this.router.navigate(['/admin/dashboard/sarys'])
            }, 4000);
          },error: (error) => {
            this.showLoading = false
            this.mostrarToast('Error al editar el usuario', 'toast-error');
            console.error('Error al editar el usuario'+ error);
          }
        })
      }else{
        this.showLoading = false
        this.mostrarToast('Deber editar algún campo', 'toast-error');
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

  ngOnInit() {
    setTimeout(() => {
      this.getInfoUser()
    }, 2000);
  }

}
