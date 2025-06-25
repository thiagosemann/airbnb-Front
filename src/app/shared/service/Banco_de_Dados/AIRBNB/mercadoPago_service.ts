import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'enviroments';

export interface PaymentResponse {
  redirectUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private baseUrl = `${environment.backendUrl}`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }


  createPayment(data: PaymentRequest): Observable<PaymentResponse> {
    const url = `${this.baseUrl}/mercadopago/preference`;
    return this.http.post<PaymentResponse>(url, data, { headers: this.getHeaders() });
  }
}
