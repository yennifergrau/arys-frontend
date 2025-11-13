import { Inject, Injectable } from '@angular/core';
import { ResourceService } from './resource.service';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { CrudBase } from '../interface/crud.interface';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CrudService<T extends CrudBase> extends ResourceService<T> {
  baseUrl: string;

  constructor(@Inject('resourceEndPoint') resourceEndPoint: string) {
    super();
    this.baseUrl = resourceEndPoint;
  }

  getResources(
    pageIndex?: number,
    pageSize?: number,
    sortField?: string | null,
    sortOrder?: string | null,
    filters?: Array<{ key: string; value: string[] }>,
    includeDeleted: boolean = false,
    searchFields?: string[] | null,
    searchText?: string | null
  ): Observable<T[]> {
    let params = new HttpParams()
      .append('page', `${pageIndex}`)
      .append('results', `${pageSize}`)
      .append('sortField', `${sortField}`)
      .append('sortOrder', `${sortOrder}`)
      .append('includeDeleted', `${includeDeleted ? 1 : 0}`);

    if (filters) {
      filters.forEach((filter) => {
        if (filter.value) {
          filter.value.forEach((value) => {
            params = params.append(filter.key, value);
          });
        }
      });
    }

    if (searchFields && searchText) {
      searchFields.forEach((searchField) => {
        params = params.append('searchFields', searchField);
      });
      params = params.append('searchText', searchText);
    }

    return this.http
      .get<T[]>(`${this.baseUrl}`, {
        params,
      })
      .pipe(
        tap(this.setResources),
        catchError(() => of())
      );
  }

  updateResource(resource: T): Observable<T> {
    const updateResource = { ...resource };
    delete updateResource.id;
    return this.http
      .patch<T>(`${this.baseUrl}/${resource.id}`, updateResource)
      .pipe(
        tap(() => {
          this.upsertResource;
        }),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }
}
