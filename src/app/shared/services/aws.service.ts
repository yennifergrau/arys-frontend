import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})

export class AwsService {

  private readonly apiFileUrl = environment.ocrFileService;
  private readonly apiImageUrl = environment.ocrImageService;

  constructor(
    private http: HttpClient
  ) { }

  public uploadImage (image:Blob) {
    const formData = new FormData();
    formData.append('file',image,'image.jpeg');
    return this.http.post<{text:string}>(`${this.apiImageUrl}/upload-add`,formData)
  }

  public fileUpload ( image: Blob) {
    const formData = new FormData();
    formData.append('file',image,'image.jpeg');
    return this.http.post<{text:string}>(`${this.apiFileUrl}/adjuntar`,formData)
  }
}
