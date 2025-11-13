import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

interface IResourceBaseObject {
  id?: number;
  checked?: boolean;
}

type ResourceType<T> = T & IResourceBaseObject;

@Injectable({
  providedIn: 'root',
})
export class ResourceService<T> {
  http = inject(HttpClient);

  _resources = signal<ResourceType<T>[]>([]);
  _selectedResourceId = signal<number>(0);
  _selectedResourcesIds = signal<number[]>([]);
  _selectedResource = computed<ResourceType<T>>(
    () => this._resources()[this._selectedResourceId()]
  );

  get resources() {
    return this._resources();
  }

  get selectedResource() {
    return this._selectedResource();
  }

  get selectedResourcesIds() {
    return this._selectedResourcesIds();
  }

  set resourceId(id: number) {
    this._selectedResourceId.set(id);
  }

  set selectedResourcesIds(ids: number[]) {
    this._selectedResourcesIds.set(ids);
  }

  protected setResources = (resources: ResourceType<T>[]) => {
    this._resources.set(resources);
  };

  protected upsertResource = (resource: ResourceType<T>) => {
    const index = this._resources().findIndex(
      (item) => item.id === resource.id
    );
    if (index === -1) {
      this._resources.set([...this._resources(), resource]);
      return;
    }

    this._resources.update((resources) => {
      resources[index] = resource;
      return resources;
    });
  };

  protected removeResource = (id: number) => {
    this._resources.set(
      this._resources().filter((resource) => resource.id !== id)
    );
  };
}
