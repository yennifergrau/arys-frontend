import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

interface UserIsActiveRequest {
  placa?: string;
  cedula?: string;
  id_user?: number;
  /** Certificado de póliza (POST `fechetd/status`; mismo valor que `certificate` en get_membership). */
  certificado?: string;
}

interface UserIsActiveResponse {
  certificado: string;
  id_vehiculo: number;
  id_persona: number;
  placa: string;
  rif: string;
  letra_rif: string;
  nombre: string;
  apellido: string;
  estatus_gene1: string;
}

@Injectable({ providedIn: 'root' })
export class EmissionService {
  private readonly http = inject(HttpClient);
  private readonly sarys_url = environment.sarys.url;
  private readonly sarys_estados = environment.sarys.propietario.estados;
  private readonly sarys_ciudades = environment.sarys.propietario.ciudades;
  private readonly sarys_genero = environment.sarys.propietario.genero;
  private readonly sarys_estado_civil =
    environment.sarys.propietario.estadoCivil;

  private readonly sarys_marca = environment.sarys.vehiculo.marcas;
  private readonly sarys_modelo = environment.sarys.vehiculo.modelos;
  private readonly sarys_version = environment.sarys.vehiculo.versiones;
  private readonly sarys_anno = environment.sarys.vehiculo.anno;
  private readonly sarys_color = environment.sarys.vehiculo.colores;
  private readonly sarys_user_status = environment.sarys.usuario.estatus;

  private readonly sarys_add_property = environment.sarys.otherAPIs.addProperty;
  private readonly sarys_add_vehicle = environment.sarys.otherAPIs.add_vehicle;
  private readonly sarys_cotizador =
    environment.sarys.otherAPIs.cobertCotizador;
  private readonly sarys_add_subscription =
    environment.sarys.otherAPIs.registerSubscriptions;
  private readonly sendDocument = environment.sarys.otherAPIs.sendDocument;

  constructor() {}

  public getEstados() {
    return this.http.get<any>(`${this.sarys_url}/${this.sarys_estados}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error cargando los estados'));
      })
    );
  }

  public getCiudades(estadoId: number) {
    return this.http
      .get<any>(`${this.sarys_url}/${this.sarys_ciudades}/${estadoId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(
            () =>
              new Error(`Error cargando las ciudades del estado id:${estadoId}`)
          );
        })
      );
  }

  public getGeneros() {
    return this.http.get<any>(`${this.sarys_url}/${this.sarys_genero}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error cargando los géneros'));
      })
    );
  }
  public getEstadoCivil() {
    return this.http
      .get<any>(`${this.sarys_url}/${this.sarys_estado_civil}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(
            () => new Error('Error cargando los estados civiles')
          );
        })
      );
  }

  public sendDocumentUser(data: any) {
    return this.http
      .post<any>(`${this.sarys_url}/${this.sendDocument}`, data)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(
            () => new Error('Error cargando al enviar documentos')
          );
        })
      );
  }

  public getMarcas() {
    return this.http.get<any>(`${this.sarys_url}/${this.sarys_marca}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error cargando las marcas'));
      })
    );
  }

  public getModelos(marcaId: number) {
    return this.http
      .get<any>(`${this.sarys_url}/${this.sarys_modelo}/${marcaId}`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error cargando los modelos'));
        })
      );
  }

  public getVersiones(marcaId: number, modeloId: number) {
    return this.http
      .get<any>(
        `${this.sarys_url}/${this.sarys_version}/${marcaId}/${modeloId}`
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error cargando las versiones'));
        })
      );
  }

  public getAnios(marcaId: number, modeloId: number, versionId: number) {
    return this.http
      .get<any>(
        `${this.sarys_url}/${this.sarys_anno}/${marcaId}/${modeloId}/${versionId}`
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error cargando los años'));
        })
      );
  }

  public getColores() {
    return this.http.get<any>(`${this.sarys_url}/${this.sarys_color}`).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('Error cargando los colores'));
      })
    );
  }

  public userIsActive(data: UserIsActiveRequest) {
    return this.http
      .post<UserIsActiveResponse>(
        `${this.sarys_url}/${this.sarys_user_status}`,
        data
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(
            () => new Error('Error validando membresia del usuario')
          );
        })
      );
  }

  public addProperty(data: any) {
    return this.http
      .post<any>(`${this.sarys_url}/${this.sarys_add_property}`, data)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error agregando propiedad'));
        })
      );
  }

  public addVehicle(data: any) {
    return this.http
      .post<any>(`${this.sarys_url}/${this.sarys_add_vehicle}`, data)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error agregando vehiculo'));
        })
      );
  }

  public startCotizador(vehiculoId: number, tipoMembresia: number) {
    return this.http
      .get<any>(
        `${this.sarys_url}/${this.sarys_cotizador}/${vehiculoId}/${tipoMembresia}`
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error iniciando cotizador'));
        })
      );
  }

  public registerSubscription(
    data: any,
    vehiculoId: number,
    personaId: number,
    tipoMembresia: number
  ) {
    return this.http
      .post<any>(
        `${this.sarys_url}/${this.sarys_add_subscription}/${vehiculoId}/${personaId}/${tipoMembresia}`,
        data
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => new Error('Error agregar la subscription'));
        })
      );
  }
}
