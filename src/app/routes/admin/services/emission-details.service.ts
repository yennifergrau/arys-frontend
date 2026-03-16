import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EmissionDetailsService {
  get planDetails(): any {
    return JSON.parse(localStorage.getItem('planDetails') || '');
  }

  get idCard(): string | any {
    return localStorage.getItem('idCard');
  }

  get licence(): string | any {
    return localStorage.getItem(' licence');
  }

  get carnet(): string | any {
    return localStorage.getItem('carnet');
  }

  get personId(): string | null {
    return localStorage.getItem('personId');
  }

  get CardNumber(): string | null {
    return localStorage.getItem('CardNumber');
  }

  get vehicleId(): string | null {
    return localStorage.getItem('vehicleId');
  }

  get numberContract():string  | any{
    return JSON.parse(localStorage.getItem('numberContract') || '');
  }

  get userData(): string | any {
    return JSON.parse(localStorage.getItem('userData') || '');
  }

  get vehicle_id_arys(): string | any {
    return localStorage.getItem('vehicle_id_arys')
  }

  get id_person_arys(): string | any {
    return localStorage.getItem('id_person_arys')
  }

  get data_vehicle(): string | any {
    return JSON.parse(localStorage.getItem('data_vehicle') || '')
  }

  get data_person(): string | any {
    return JSON.parse(localStorage.getItem('data_person') || '')
  }

  get lineaCustomer() : string | any{
    return JSON.parse(localStorage.getItem('lineaCustomer') || '')
  }

  get creditLine(): any {
    const val = localStorage.getItem('creditLine');
    return val ? JSON.parse(val) : null;
  }

  get data_user(): string | any {
    return JSON.parse(localStorage.getItem('userData') || '')
  }

  get commerceData(): string | any {
    return JSON.parse(localStorage.getItem('commerceData') || '')
  }

  get paymentData(): string | any {
    return JSON.parse(localStorage.getItem('paymentData') || '')
  }

  //Setters

  set planDetails(value: string) {
    localStorage.setItem('planDetails', JSON.stringify(value));
  }

  set lineaCustomer(value:string){
    localStorage.setItem('lineaCustomer', JSON.stringify(value))
  }

  set idCard(value: any) {
    localStorage.setItem('idCard', value);
  }

  set licence(value: any) {
    localStorage.setItem('licence', value);
  }
  set carnet(value: any) {
    localStorage.setItem('carnet', value);
  }

  set personId(value: string) {
    localStorage.setItem('personId', value);
  }

  
  set CardNumber(value: string) {
    localStorage.setItem('CardNumber', value);
  }

  set commerceData(value:string){
    localStorage.setItem('commerceData',JSON.stringify(value))
  }


  set vehicleId(value: string) {
    localStorage.setItem('vehicleId', value);
  }

  set numberContract(value: string) {
    localStorage.setItem('numberContract',JSON.stringify(value));
  }

  set paymentData(value:string) {
    localStorage.setItem('paymentData',JSON.stringify(value))
  }

  set userData(value: string) {
    localStorage.setItem('userData', JSON.stringify(value));
  }

  set vehicle_id_arys(value:string){
    localStorage.setItem('vehicle_id_arys',value)
  }

  set id_person_arys(value:string){
    localStorage.setItem('id_person_arys',value)
  }

  set data_vehicle(value:any){
    localStorage.setItem('data_vehicle',JSON.stringify(value))
  }

  set data_person(value:any){
    localStorage.setItem('data_person',JSON.stringify(value))
  }


  set data_user(value:any) {
    localStorage.setItem('data_user',JSON.stringify(value))
  }

  set creditLine(value: any) {
    localStorage.setItem('creditLine', JSON.stringify(value));
  }
}
