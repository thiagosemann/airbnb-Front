import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from './Banco_de_Dados/authentication';

/**
 * Trata de forma global as respostas em que o backend encerra o acesso:
 * empresa suspensa (403 EMPRESA_INATIVA) e sessão expirada/inválida (401).
 * Sem isso, o usuário fica preso na tela com um erro genérico em vez de
 * voltar para o login.
 */
@Injectable()
export class AcessoInterceptor implements HttpInterceptor {

  // Uma tela costuma disparar várias requisições em paralelo; sem isso o
  // usuário receberia um toast por resposta recusada.
  private encerrando = false;

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private authService: AuthenticationService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // A própria tela de login já exibe o motivo da recusa.
        const ehLogin = req.url.includes('/login');

        if (!ehLogin) {
          const codigo = error.error?.code;

          if (error.status === 403 && codigo === 'EMPRESA_INATIVA') {
            this.encerrarSessao(error.error?.message || 'Acesso suspenso. Entre em contato com o suporte.');
          } else if (error.status === 401) {
            this.encerrarSessao('Sessão expirada. Faça login novamente.');
          }
        }

        return throwError(() => error);
      })
    );
  }

  private encerrarSessao(mensagem: string): void {
    if (this.encerrando || this.router.url.includes('/login')) {
      return;
    }
    this.encerrando = true;
    this.authService.logout();
    this.toastr.error(mensagem);
    this.router.navigate(['/login']).finally(() => {
      this.encerrando = false;
    });
  }
}
