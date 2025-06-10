import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from './Banco_de_Dados/authentication';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {

  constructor(private router: Router, private authService: AuthenticationService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    // Verifica se a rota requer uma role específica
    const expectedRole = route.data['role'];
    const user = this.authService.getUser();

    if (expectedRole && user?.role !== expectedRole) {
      // Redireciona ou mostra erro se não for admin
      this.router.navigate(['/login']); // ou /acesso-negado
      return false;
    }

    return true;
  }
}
