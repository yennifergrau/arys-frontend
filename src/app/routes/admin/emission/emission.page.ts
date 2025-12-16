import { NavController } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TabComponent } from 'src/app/shared/components/tab/tab.component';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmissionService } from '../services/emission.service';
import { SpinnerComponent } from 'src/app/shared/components/spinner.component';
import { forkJoin, Observable } from 'rxjs';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { EmissionDetailsService } from '../services/emission-details.service';
import { DataArysService } from '../services/data-arys.service';

@Component({
  selector: 'app-emission',
  templateUrl: './emission.page.html',
  styleUrls: ['./emission.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SpinnerComponent,
    NgxMaskDirective,
    HttpClientModule,
  ],
  providers: [EmissionService, DataArysService, provideNgxMask()],
})
export class EmissionPage implements OnInit {
  private terminosAcept : boolean = false;
  public showTerminosError: boolean = false;
  public checkboxError: boolean = false;
  activatedRoute = inject(ActivatedRoute);
  navCtrl = inject(NavController);
  fb = inject(FormBuilder);
  emission = inject(EmissionService);
  arys_service = inject(DataArysService);
  emission_details = inject(EmissionDetailsService);
  vehicleOwnership: boolean = true;
  showSpinner: boolean = false;
  renderer = inject(Renderer2);
  encryptedData: string | null = null;
  emissionForm = this.fb.group({
    pagador: this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cedula: ['', Validators.required],
      prefijo: ['V', Validators.required],
      genero: [null, Validators.required],
      estadoCivil: [null, Validators.required],
      direccion: ['', Validators.required],
      estado: [null, Validators.required],
      ciudad: [null, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
    }),
    titular: this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cedula: ['', Validators.required],
      prefijo: ['V', Validators.required],
      genero: [null, Validators.required],
      estadoCivil: [null, Validators.required],
      direccion: ['', Validators.required],
      estado: [null, Validators.required],
      ciudad: [null, Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', Validators.required],
    }),
    vehiculo: this.fb.group({
      marca: [null, Validators.required],
      modelo: [null, Validators.required],
      version: [null, Validators.required],
      anio: [null, [Validators.required, Validators.min(1900)]],
      color: [null, Validators.required],
      placa: ['', [Validators.required, 
        Validators.pattern(/^[A-Z0-9]{3}-[A-Z0-9]{3,4}$/)]],
      serial: ['', Validators.required],
    }),
  });

  generosOptions: any[] = [];
  estadoCivilOptions: any[] = [];
  estadosOptions: any[] = [];
  ciudadesOptions: any[] = [];
  marcasOptions: any[] = [];
  modelosOptions: any[] = [];
  versionesOptions: any[] = [];
  aniosOptions: any[] = [];
  coloresOptions: any[] = [];
  filteredEstadosOptions: any[] = [];
  filteredCiudadesOptions: any[] = [];
  filteredMarcasOptions: any[] = [];
  filteredModelosOptions: any[] = [];
  filteredVersionesOptions: any[] = [];
  filteredAniosOptions: any[] = [];
  filteredColoresOptions: any[] = [];

  // Our api data
  currentState!: string;
  currentCity!: string;
  currentBrand!: string;
  currentModel!: string;
  currentVersion!: string;
  currentYear!: string;
  currentColor!: string;

  constructor() {}

  get pagador() {
    return this.emissionForm.get('pagador') as FormGroup;
  }

  get titular() {
    return this.emissionForm.get('titular') as FormGroup;
  }

  get vehiculo() {
    return this.emissionForm.get('vehiculo') as FormGroup;
  }

  // Para acceder a los campos dentro de "pagador"
  get pagadorNombre(): AbstractControl<any> {
    return this.pagador.get('nombre')!;
  }

  get pagadorApellido(): AbstractControl<any> {
    return this.pagador.get('apellido')!;
  }

  get pagadorCedula(): AbstractControl<any> {
    return this.pagador.get('cedula')!;
  }

  get pagadorGenero(): AbstractControl<any> {
    return this.pagador.get('genero')!;
  }

  get pagadorEstadoCivil(): AbstractControl<any> {
    return this.pagador.get('estadoCivil')!;
  }

  get pagadorDireccion(): AbstractControl<any> {
    return this.pagador.get('direccion')!;
  }

  get pagadorEstado(): AbstractControl<any> {
    return this.pagador.get('estado')!;
  }

  get pagadorCiudad(): AbstractControl<any> {
    return this.pagador.get('ciudad')!;
  }

  get pagadorEmail(): AbstractControl<any> {
    return this.pagador.get('email')!;
  }

  get pagadorTelefono(): AbstractControl<any> {
    return this.pagador.get('telefono')!;
  }

  // Para acceder a los campos dentro de "titular"
  get titularNombre(): AbstractControl<any> {
    return this.titular.get('nombre')!;
  }

  get titularCedula(): AbstractControl<any> {
    return this.titular.get('cedula')!;
  }

  get titularApellido(): AbstractControl<any> {
    return this.titular.get('apellido')!;
  }

  get titularGenero(): AbstractControl<any> {
    return this.titular.get('genero')!;
  }

  get titularEstadoCivil(): AbstractControl<any> {
    return this.titular.get('estadoCivil')!;
  }

  get titularDireccion(): AbstractControl<any> {
    return this.titular.get('direccion')!;
  }

  get titularEstado(): AbstractControl<any> {
    return this.titular.get('estado')!;
  }

  get titularCiudad(): AbstractControl<any> {
    return this.titular.get('ciudad')!;
  }

  get titularEmail(): AbstractControl<any> {
    return this.titular.get('email')!;
  }

  get titularTelefono(): AbstractControl<any> {
    return this.titular.get('telefono')!;
  }

  // Para acceder a los campos dentro de "vehiculo"
  get vehiculoMarca(): AbstractControl<any> {
    return this.vehiculo.get('marca')!;
  }

  get vehiculoModelo(): AbstractControl<any> {
    return this.vehiculo.get('modelo')!;
  }

  get vehiculoVersion(): AbstractControl<any> {
    return this.vehiculo.get('version')!;
  }

  get vehiculoAnio(): AbstractControl<any> {
    return this.vehiculo.get('anio')!;
  }

  get vehiculoColor(): AbstractControl<any> {
    return this.vehiculo.get('color')!;
  }

  get vehiculoPlaca(): AbstractControl<any> {
    return this.vehiculo.get('placa')!;
  }

  get vehiculoSerial(): AbstractControl<any> {
    return this.vehiculo.get('serial')!;
  }

  //getters para Datos de Api
  get currentMaritalStatus(): string {
    const estadoCivilValue = this.emissionForm.get(
      'titular.estadoCivil'
    )?.value;

    console.log(this.emissionForm.get('titular.estadoCivil')?.value);

    if (estadoCivilValue === null || estadoCivilValue === undefined) {
      return '';
    }
    switch (estadoCivilValue as string) {
      case '1':
        return 'CASADO';
      case '2':
        return 'DIVORCIADO';
      case '3':
        return 'SOLTERO';
      case '4':
        return 'VIUDO';
      default:
        return '';
    }
  }

  get currentGender(): string {
    const generoValue = this.emissionForm.get('titular.genero')?.value;
    if (generoValue === null || generoValue === undefined) {
      return '';
    }
    switch (generoValue as string) {
      case '1':
        return 'M';
      case '2':
        return 'F';
      default:
        return '';
    }
  }

  formatPlaca(event: any): void {
    let value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (value.length > 3) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    }

    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    event.target.value = value;
    this.emissionForm.get('vehiculo.placa')?.setValue(value);
  }

  ngOnInit() {
    this.showSpinner = true;
    this.emissionForm?.get('pagador')?.get('ciudad')?.disable();
    this.emissionForm?.get('titular')?.get('ciudad')?.disable();
    this.emissionForm.get('vehiculo')?.get('modelo')?.disable();
    this.emissionForm.get('vehiculo')?.get('version')?.disable();
    this.emissionForm.get('vehiculo')?.get('anio')?.disable();
    // this.StorageDataFound();
    forkJoin({
      estados: this.emission.getEstados(),
      estadoCivil: this.emission.getEstadoCivil(),
      generos: this.emission.getGeneros(),
      marcas: this.emission.getMarcas(),
      colores: this.emission.getColores(),
    }).subscribe({
      next: (results) => {
        this.estadosOptions = results.estados;
        this.estadoCivilOptions = results.estadoCivil;
        this.generosOptions = results.generos;
        this.marcasOptions = results.marcas;
        this.coloresOptions = results.colores;
        this.showSpinner = false;
      },
      error: () => {
        this.mostrarToast(
          'No se pudo recuperar la información del servidor',
          'toast-error'
        );
      },
    });
    this.activatedRoute.paramMap.subscribe((params) => {
      this.encryptedData = params.get('data-details');
    });
  }

  onVehicleOwnershipChange() {
    if (this.vehicleOwnership) {
      this.emissionForm
        .get('titular')
        ?.patchValue(this.emissionForm.get('pagador')!.value);
    } else {
      this.emissionForm.get('titular')?.reset();
      this.emissionForm.get('titular')?.patchValue({
        nombre: '',
        apellido: '',
        cedula: '',
        prefijo: 'V',
        genero: null,
        estadoCivil: null,
        direccion: '',
        estado: null,
        ciudad: null,
        email: '',
        telefono: '',
      });
    }
  }

  private StorageDataFound() {
    const StoredLicense: string | null = localStorage.getItem('OCR_LICENCIA');
    const StoredCarnet: string | null = localStorage.getItem('OCR_CARNET');
    const StoredCedula: string | null = localStorage.getItem('OCR_CEDULA');

    const LICENSE = StoredLicense ? JSON.parse(StoredLicense) : {};
    const CARNET = StoredCarnet ? JSON.parse(StoredCarnet) : {};
    const CEDULA = StoredCedula ? JSON.parse(StoredCedula) : {};

    const numeroCedulaSoloNumeros = CEDULA.numero_de_cedula
      ? CEDULA.numero_de_cedula.replace(/\D/g, '')
      : '';
    const numeroLicenseSoloNumeros = LICENSE.numero_de_cedula
      ? LICENSE.numero_de_cedula.replace(/\D/g, '')
      : '';
    const numerocEDULASoloNumeros = CARNET.numero_de_cedula
      ? CARNET.numero_de_cedula.replace(/\D/g, '')
      : '';

    const nombreLimpio = (CEDULA.nombre ?? LICENSE.nombre ?? '')
      .replace(/FIRMA\s*TITULAR/g, '')
      .replace(/FIRMATITULAR/g, '')
      .trim();

    const apellidoLimpio = (CEDULA.apellido ?? LICENSE.apellido ?? '')
      .replace(/FIRMA\s*TITULAR/g, '')
      .replace(/FIRMATITULAR/g, '')
      .trim();

    // Actualizamos los valores en el formulario
    this.emissionForm.patchValue({
      pagador: {
        nombre: nombreLimpio ?? '',
        apellido: apellidoLimpio ?? '',
        cedula:
          numeroCedulaSoloNumeros ??
          numeroLicenseSoloNumeros ??
          numerocEDULASoloNumeros ??
          '',
      },
      vehiculo: {
        placa: CARNET.placa ?? '',
        serial: CARNET.serial_de_motor ?? '',
        anio: CARNET.año ?? '',
      },
    });
  }

  filterEstados(event: any, formGroupName: string) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredEstadosOptions = this.estadosOptions.filter((estado) =>
      estado.estado1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(
      `estado_${formGroupName}`
    ) as HTMLInputElement;

    this.filteredEstadosOptions.map((e) => {
      if (e.estado1.toLowerCase() === searchTerm) {
        this.currentState = e.estado1;

        this.emissionForm
          .get(formGroupName)!
          .get('estado')
          ?.setValue(e.id_estado);

        this.emissionForm.get(formGroupName)?.get('ciudad')?.setValue(null);
        const ciudadInput = document.getElementById(
          `ciudad_${formGroupName}`
        ) as HTMLInputElement;
        if (ciudadInput) {
          ciudadInput.value = '';
        }

        this.emissionForm?.get('titular')?.get('ciudad')?.enable();
        this.emissionForm?.get('pagador')?.get('ciudad')?.enable();

        this.showSpinner = true;

        this.emission.getCiudades(e.id_estado).subscribe((ciudades) => {
          this.showSpinner = false;
          this.ciudadesOptions = ciudades.result;
          this.filteredCiudadesOptions = [];
        });

        if (inputElement) {
          inputElement.value = e.estado1;
        }

        this.filteredEstadosOptions = [];
      }
    });
  }

  filterCiudades(event: any, formGroupName: string) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredCiudadesOptions = this.ciudadesOptions.filter((ciudad) =>
      ciudad.ciudad1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(
      `ciudad_${formGroupName}`
    ) as HTMLInputElement;

    this.filteredCiudadesOptions.map((e) => {
      this.currentCity = e.ciudad1;

      if (e.ciudad1.toLowerCase() === searchTerm) {
        this.emissionForm
          .get(formGroupName)!
          .get('ciudad')
          ?.setValue(e.id_ciudad);

        if (inputElement) {
          inputElement.value = e.ciudad1;
        }

        this.filteredCiudadesOptions = [];
      }
    });
  }

  filterMarcas(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredMarcasOptions = this.marcasOptions.filter((marca) =>
      marca.marca1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(`marca`) as HTMLInputElement;

    this.filteredMarcasOptions.map((e) => {
      if (e.marca1.toLowerCase() === searchTerm) {
        this.currentBrand = e.marca1;

        this.emissionForm.get('vehiculo')!.get('marca')?.setValue(e.id_marca);

        this.emissionForm.get('vehiculo')?.get('modelo')?.setValue(null);
        this.emissionForm.get('vehiculo')?.get('version')?.setValue(null);
        this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
        const modeloInput = document.getElementById(
          'modelo'
        ) as HTMLInputElement;
        if (modeloInput) {
          modeloInput.value = '';
        }

        this.emissionForm!.get('vehiculo')!.get('modelo')!.enable();

        this.showSpinner = true;

        this.emission.getModelos(e.id_marca).subscribe((modelos) => {
          this.showSpinner = false;
          this.modelosOptions = modelos;
          this.filteredModelosOptions = [];
          this.filteredVersionesOptions = [];
          this.filteredAniosOptions = [];
        });

        if (inputElement) {
          inputElement.value = e.marca1;
        }

        this.filteredMarcasOptions = [];
      }
    });
  }

  filterModelos(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredModelosOptions = this.modelosOptions.filter((modelo) =>
      modelo.modelo1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(`modelo`) as HTMLInputElement;

    this.filteredModelosOptions.map((e) => {
      if (e.modelo1.toLowerCase() === searchTerm) {
        this.currentModel = e.modelo1;

        this.emissionForm.get('vehiculo')!.get('modelo')?.setValue(e.id_modelo);

        this.emissionForm.get('vehiculo')?.get('version')?.setValue(null);
        this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
        const versionInput = document.getElementById(
          'version'
        ) as HTMLInputElement;
        if (versionInput) {
          versionInput.value = '';
        }

        this.emissionForm!.get('vehiculo')!.get('version')!.enable();

        this.showSpinner = true;

        const selectedMarca =
          this.emissionForm.get('vehiculo')?.get('marca')?.value ?? 0;

        this.emission
          .getVersiones(selectedMarca, e.id_modelo)
          .subscribe((versiones) => {
            this.showSpinner = false;
            this.versionesOptions = versiones;
            this.filteredVersionesOptions = [];
            this.filteredAniosOptions = [];
          });

        if (inputElement) {
          inputElement.value = e.modelo1;
        }

        this.filteredModelosOptions = [];
      }
    });
  }

  filterVersiones(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredVersionesOptions = this.versionesOptions.filter((version) =>
      version.version1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(`version`) as HTMLInputElement;

    this.filteredVersionesOptions.map((e) => {
      if (e.version1.toLowerCase() === searchTerm) {
        this.currentVersion = e.version1;
        this.emissionForm
          .get('vehiculo')!
          .get('version')
          ?.setValue(e.id_version);

        this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
        const anioInput = document.getElementById('anio') as HTMLInputElement;
        if (anioInput) {
          anioInput.value = '';
        }

        this.emissionForm!.get('vehiculo')!.get('anio')!.enable();

        this.showSpinner = true;

        const selectedMarca =
          this.emissionForm.get('vehiculo')?.get('marca')?.value ?? 0;

        const selectedModelo =
          this.emissionForm.get('vehiculo')?.get('modelo')?.value ?? 0;

        this.emission
          .getAnios(selectedMarca, selectedModelo, e.id_version)
          .subscribe((anios) => {
            this.showSpinner = false;
            this.aniosOptions = anios;
            this.filteredAniosOptions = [];
          });

        if (inputElement) {
          inputElement.value = e.version1;
        }

        this.filteredVersionesOptions = [];
      }
    });
  }

  filterAnios(event: any) {
    const searchTerm = event.target.value.toString();
    this.filteredAniosOptions = this.aniosOptions.filter((anio) =>
      anio.anno.toString().includes(searchTerm)
    );

    const inputElement = document.getElementById(`anio`) as HTMLInputElement;

    this.filteredAniosOptions.map((e) => {
      this.currentYear = e.anno;

      if (e.anno.toString() === searchTerm) {
        this.emissionForm.get('vehiculo')?.get('anio')?.setValue(e.id_valor);

        if (inputElement) {
          inputElement.value = e.anno;
        }

        this.filteredAniosOptions = [];
      }
    });
  }

  filterColores(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filteredColoresOptions = this.coloresOptions.filter((color) =>
      color.color1.toLowerCase().includes(searchTerm)
    );

    const inputElement = document.getElementById(`color`) as HTMLInputElement;

    this.filteredColoresOptions.map((e) => {
      if (e.color1.toLowerCase() === searchTerm) {
        this.currentColor = e.color1;

        this.emissionForm.get('vehiculo')?.get('color')?.setValue(e.id_color);

        if (inputElement) {
          inputElement.value = e.color1;
        }

        this.filteredColoresOptions = [];
      }
    });
  }

  selectEstado(estado: any, formGroupName: string) {
    this.currentState = estado.estado1;

    // Set the estado value in the form
    this.emissionForm
      .get(formGroupName)
      ?.get('estado')
      ?.setValue(estado.id_estado);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById(
      `estado_${formGroupName}`
    ) as HTMLInputElement;
    if (inputElement) {
      console.log(inputElement);
      inputElement.value = estado.estado1;
    }

    // Clear the ciudad selection since estado has changed
    this.emissionForm.get(formGroupName)?.get('ciudad')?.setValue(null);
    const ciudadInput = document.getElementById(
      `ciudad_${formGroupName}`
    ) as HTMLInputElement;
    if (ciudadInput) {
      ciudadInput.value = '';
    }

    this.emissionForm?.get('titular')?.get('ciudad')?.enable();
    this.emissionForm?.get('pagador')?.get('ciudad')?.enable();

    this.showSpinner = true;

    this.emission.getCiudades(estado.id_estado).subscribe((ciudades) => {
      this.showSpinner = false;
      this.ciudadesOptions = ciudades.result;
      this.filteredCiudadesOptions = [];
    });
  }

  selectCiudad(ciudad: any, formGroupName: string) {
    this.currentCity = ciudad.ciudad1;

    // Set the ciudad value in the form
    this.emissionForm
      .get(formGroupName)
      ?.get('ciudad')
      ?.setValue(ciudad.id_ciudad);

    // Update the input field to show the selected ciudad name
    const inputElement = document.getElementById(
      `ciudad_${formGroupName}`
    ) as HTMLInputElement;
    if (inputElement) {
      inputElement.value = ciudad.ciudad1;
    }
  }

  selectMarca(marca: any) {
    this.currentBrand = marca.marca1;

    this.emissionForm.get('vehiculo')?.get('marca')?.setValue(marca.id_marca);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById('marca') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = marca.marca1;
    }

    // Clear the model, version, and year since brand has changed
    this.emissionForm.get('vehiculo')?.get('modelo')?.setValue(null);
    this.emissionForm.get('vehiculo')?.get('version')?.setValue(null);
    this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
    const modeloInput = document.getElementById('modelo') as HTMLInputElement;
    if (modeloInput) {
      modeloInput.value = '';
    }

    this.emissionForm!.get('vehiculo')!.get('modelo')!.enable();

    this.showSpinner = true;

    this.emission.getModelos(marca.id_marca).subscribe((modelos) => {
      this.showSpinner = false;
      this.modelosOptions = modelos;
      this.filteredModelosOptions = [];
      this.filteredVersionesOptions = [];
      this.filteredAniosOptions = [];
    });
  }

  selectModelo(modelo: any) {
    this.currentModel = modelo.modelo1;

    this.emissionForm
      .get('vehiculo')
      ?.get('modelo')
      ?.setValue(modelo.id_modelo);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById('modelo') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = modelo.modelo1;
    }

    // Clear the version and year selection since modelo has changed
    this.emissionForm.get('vehiculo')?.get('version')?.setValue(null);
    this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
    const versionInput = document.getElementById('version') as HTMLInputElement;
    if (versionInput) {
      versionInput.value = '';
    }

    this.emissionForm!.get('vehiculo')!.get('version')!.enable();

    this.showSpinner = true;

    const selectedMarca =
      this.emissionForm.get('vehiculo')?.get('marca')?.value ?? 0;

    this.emission
      .getVersiones(selectedMarca, modelo.id_modelo)
      .subscribe((versiones) => {
        this.showSpinner = false;
        this.versionesOptions = versiones;
        this.filteredVersionesOptions = [];
        this.filteredAniosOptions = [];
      });
  }

  selectVersion(version: any) {
    this.currentVersion = version.version1;

    this.emissionForm
      .get('vehiculo')
      ?.get('version')
      ?.setValue(version.id_version);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById('version') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = version.version1;
    }

    // Clear the year selection since modelo has changed
    this.emissionForm.get('vehiculo')?.get('anio')?.setValue(null);
    const anioInput = document.getElementById('anio') as HTMLInputElement;
    if (anioInput) {
      anioInput.value = '';
    }

    this.emissionForm!.get('vehiculo')!.get('anio')!.enable();

    this.showSpinner = true;

    const selectedMarca =
      this.emissionForm.get('vehiculo')?.get('marca')?.value ?? 0;

    const selectedModelo =
      this.emissionForm.get('vehiculo')?.get('modelo')?.value ?? 0;

    this.emission
      .getAnios(selectedMarca, selectedModelo, version.id_version)
      .subscribe((anios) => {
        this.showSpinner = false;
        this.aniosOptions = anios;
        this.filteredAniosOptions = [];
      });
  }

  selectAnio(anio: any) {
    this.currentYear = anio.anno;

    this.emissionForm.get('vehiculo')?.get('anio')?.setValue(anio.id_valor);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById('anio') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = anio.anno;
    }
  }

  selectColor(color: any) {
    this.currentColor = color.color1;

    this.emissionForm.get('vehiculo')?.get('color')?.setValue(color.id_color);

    // Update the input field to show the selected estado name
    const inputElement = document.getElementById('color') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = color.color1;
    }
  }

  public onValidateAndSubmit(): void {
  // 1. Marcar todos los campos del formulario como "tocados" 
  //    para que el usuario vea todos los errores de validación (si los hay).
  this.emissionForm.markAllAsTouched(); 
  
  // Resetear la visibilidad de los errores de términos al inicio
  this.showTerminosError = false;
  this.checkboxError = false;

  const formValido = this.emissionForm.valid;
  const terminosAceptados = this.terminosAcept;

  // ------------------------------------------------------------------
  // A. CASO: Formulario VÁLIDO Y Términos ACEPTADOS (TODO CORRECTO)
  // ------------------------------------------------------------------
  if (formValido && terminosAceptados) {
    this.showSpinner = true;
    this.verifyPlate(); // Pasar al siguiente paso (Verificación de placa)
    return;
  }
  
  // ------------------------------------------------------------------
  // B. CASO: Formulario VÁLIDO, pero Términos NO ACEPTADOS
  // ------------------------------------------------------------------
  if (formValido && !terminosAceptados) {
    // Si el formulario está perfecto, pero faltan los términos:
    this.showTerminosError = true;
    this.checkboxError = true;
    this.mostrarToast(
      'Debe aceptar los Términos y Condiciones para continuar.',
      'toast-error'
    );
    return;
  }

  // ------------------------------------------------------------------
  // C. CASO: Formulario INVÁLIDO (Independientemente de los Términos)
  // ------------------------------------------------------------------

  // En cualquier otro caso (Formulario INVÁLIDO), mostramos el error general
  // y aplicamos la lógica de términos solo si es necesario.
  
  if (!formValido) {
    this.mostrarToast(
      'Por favor, complete todos los campos requeridos correctamente.',
      'toast-error'
    );
    
    // Si el formulario es inválido Y tampoco aceptó los términos:
    if (!terminosAceptados) {
      this.showTerminosError = true;
      this.checkboxError = true;
      // No necesitamos un Toast adicional, el anterior ya es suficiente.
    } else {
      // Si el formulario es inválido PERO SÍ aceptó los términos:
      // No pasa nada con los términos, solo se muestra el error del formulario.
      this.showTerminosError = false;
      this.checkboxError = false;
    }
    return;
  }
}

  public verifyPlate() {
    const placa =
      this.emissionForm
        .get('vehiculo')
        ?.get('placa')
        ?.value?.replace('-', '') ?? '';
    console.log(placa);

    this.emission.userIsActive({ placa: placa }).subscribe({
      next: (response: any) => {
        console.log(response);
        if (response.estatus_gene1 === 'ACTIVO') {
          this.mostrarToast(
            `El vehículo con placa ${placa} ya se encuentra con una subscripción activa`,
            'toast-error'
          );
          this.emissionForm.markAllAsTouched();
          this.showSpinner = false;
        } else {
          // this.showSpinner = false;
          this.onSubmit();
        }
      },
      error: (err: any) => {
        console.log(err)
        this.mostrarToast(
          'No se pudo verificar la actividad del usuario',
          'toast-error'
        );
        this.showSpinner = false;
      },
    });
  }


  private saveData(){
    let data_person={
      titular: this.emissionForm.get('titular.nombre')?.value +' '+ this.emissionForm.get('titular.apellido')?.value,
      email: this.emissionForm.get('titular.email')?.value,
      cedula: this.emissionForm.get('titular.prefijo')?.value + ' ' + this.emissionForm.get('titular.cedula')?.value,
      phone: this.emissionForm.get('titular.telefono')?.value
    }
        console.log(data_person)
    this.emission_details.data_person = data_person;

    let dataVehicle = {
      brand: this.currentBrand,
      model: this.currentModel,
      year: this.currentYear,
      color: this.currentColor,
      plate : this.emissionForm.get('vehiculo.placa')?.value
    }
        console.log(dataVehicle)
    this.emission_details.data_vehicle = dataVehicle
  }

public onTerminosChange(): void {
    this.terminosAcept = !this.terminosAcept; 
    if(this.terminosAcept){
      this.showTerminosError = false;
      this.checkboxError = false;
    }
  }

  onSubmit() {
    // this.showSpinner = true;

    this.emissionForm.get('pagador')!.value;
    this.emissionForm
      .get('titular')!
      .patchValue(this.emissionForm.get('pagador')!.value);

     
    try {
      const dataProperty = {
        rif: this.emissionForm.get('titular.cedula')?.value,
        nombre: this.emissionForm.get('titular.nombre')?.value,
        apellido: this.emissionForm.get('titular.apellido')?.value,
        direccion: this.emissionForm.get('titular.direccion')?.value,
        id_ciudad: this.emissionForm.get('titular.ciudad')?.value,
        telefono: this.emissionForm.get('titular.telefono')?.value,
        celular: this.emissionForm.get('titular.telefono')?.value,
        fax: '',
        email: this.emissionForm.get('titular.email')?.value,
        id_parentesco: Number(this.emissionForm.get('titular.genero')?.value),
        id_persona_fami: 0,
        fec_nacimiento: '2025-03-25T14:29:36.646Z',
        letra_rif: this.emissionForm.get('titular.prefijo')?.value,
        id_estado: this.emissionForm.get('titular.estado')?.value,
        profesion: '',
        ocupacion: '',
        es_responsable_pago: true,
      };
      console.log(dataProperty)
      this.emission.addProperty(dataProperty).subscribe({
        next: async (result) => {
          const idPerson = result;
      console.log(result)
          if (idPerson) {
            this.add_person_arys();
            this.saveData()
            this.mostrarToast(
              'Propietario agregado con exito',
              'toast-success'
            );
            this.emission_details.personId = idPerson;
            setTimeout(() => {
              this.addVehicle(idPerson);
              this.navCtrl.navigateForward([`/admin/subscription-payment`]);
            }, 3000);
          }
        },
        error: (error) => {
      console.log(error)
          this.mostrarToast(
            'No se pudo registrar el propietario',
            'toast-error'
          );
          this.showSpinner = false;
        },
      });
    } catch (e) {
      console.log(e)
      console.error(e);
    }
  }

  private addVehicle(idPerson: number) {
    try {
      const data = {
        id_color: this.emissionForm.get('vehiculo.color')?.value,
        id_tipo_vehi: 1,
        placa: this.emissionForm.get('vehiculo.placa')?.value!.replace('-', ''),
        serial_motor: this.emissionForm.get('vehiculo.serial')?.value,
        serial_carroceria: this.emissionForm.get('vehiculo.serial')?.value,
        capacidad: 4,
        id_marca: this.emissionForm.get('vehiculo.marca')?.value,
        id_modelo: this.emissionForm.get('vehiculo.modelo')?.value,
        id_version: this.emissionForm.get('vehiculo.version')?.value,
        transmision: '0',
        kilometraje: 1000,
        anio: this.emissionForm.get('vehiculo.anio')?.value,
        capacidad_pasajero: 4,
        id_propietario: idPerson,
        precio_inmas: 0,
        num_certificado_origen: '00000',
        importado: true,
      };
      console.log(data);
      this.emission.addVehicle(data).subscribe({
        next: (result) => {
          console.log(result);
          const idVehicle = result;
          this.emission_details.vehicleId = idVehicle;
          if (idVehicle) {
            this.mostrarToast(
              'Vehiculo registrado exitosamente',
              'toast-success'
            );
            this.showSpinner = false;
          }
        },
        error: (error) => {
          console.error(error);
          this.mostrarToast('No se pudo registrar el vehiculo', 'toast-error');
          this.showSpinner = false;
        },
      });
    } catch (e) {
      console.error(e);
    }
    return;
  }

  private add_person_arys() {
    try {
      const data: any = {
        fullname:
          this.emissionForm.get('titular.nombre')?.value +
          ' ' +
          this.emissionForm.get('titular.apellido')?.value,
        prefix: this.emissionForm.get('titular.prefijo')?.value,
        rif: this.emissionForm.get('titular.cedula')?.value,
        city: this.currentCity,
        state: this.currentState,
        email: this.emissionForm.get('titular.email')?.value,
        marital_status: this.currentMaritalStatus,
        gender: this.currentGender,
        phone: this.emissionForm.get('titular.telefono')?.value,
        direction: this.emissionForm.get('titular.direccion')?.value,
      };
      console.log(data)
      this.arys_service.add_person(data).subscribe({
        next: (result) => {
      console.log(result)
          this.add_vehicle_arys(result.id_person);
          this.emission_details.id_person_arys = result.id_person;
        },
        error: (error) => {
      console.log(error)
          // console.error(error);
        },
      });
    } catch (e) {
      console.log(e)
      // console.error(e);
    }
  }

  private add_vehicle_arys(idPerson: number) {
    try {
      const data: any = {
        brand: this.currentBrand,
        model: this.currentModel,
        version: this.currentVersion,
        year: this.currentYear,
        color: this.currentColor,
        serial: this.emissionForm.get('vehiculo.serial')?.value,
        plate: this.emissionForm.get('vehiculo.placa')?.value!.replace('-', ''),
        id_person: idPerson,
      };
      console.log(data)
      this.arys_service.add_vehicle(data).subscribe({
        next: (result) => {
      console.log(result)
          // console.log(result);
          this.emission_details.vehicle_id_arys = result.id_veh;
        },
        error: (error) => {
      console.log(error)
          // console.log(error);
        },
      });
    } catch (e) {
      console.log(e)
      // console.error(e);
    }
  }

  private mostrarToast(mensaje: string, estilo: string) {
    const toastContainer = document.getElementById('toastContainer-emission');
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
