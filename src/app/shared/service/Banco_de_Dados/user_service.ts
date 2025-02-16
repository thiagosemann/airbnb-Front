import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { User } from '../../utilitarios/user';
import { environment } from 'enviroments';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private url = environment.backendUrl;
  constructor(private http: HttpClient) {}

  // Método para obter todos os usuários
  getUsers(): Observable<User[]> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    return this.http.get<User[]>(`${this.url}/users`, { headers });
  }

  // Método para adicionar um novo usuário
  addUser(user: User): Observable<{ insertId: number }> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    return this.http.post<{ insertId: number }>(`${this.url}/users`, user, { headers });
  }


  // Método para obter um usuário pelo ID
  getUser(userId: number): Observable<User> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    return this.http.get<User>(`${this.url}/users/${userId}`, { headers });
  }

  // Método para atualizar um usuário
  updateUser(user: User): Observable<{ message: string }> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    const userId = user.id; // Garanta que o objeto User tenha a propriedade 'id'
    return this.http.put<{ message: string }>(`${this.url}/users/${userId}`, user, { headers });
  }

  // Método para deletar um usuário
  deleteUser(userId: number): Observable<{ message: string }> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    return this.http.delete<{ message: string }>(`${this.url}/users/${userId}`, { headers });
  }



  // Método para obter um usuário pelo CPF
  getUserByCPF(cpf: string): Observable<User> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: 'Bearer ' + token,
    });

    return this.http.get<User>(`${this.url}/users/cpf/${cpf}`, { headers });
  }

    // Método para obter usuários por papel (role)
    getUsersByRole(role: string): Observable<User[]> {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + token,
      });
  
      return this.http.get<User[]>(`${this.url}/users/role/${role}`, { headers });
    }

}