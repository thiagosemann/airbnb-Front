import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../shared/service/Banco_de_Dados/authentication';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  // Mesmo mínimo do cadastro (register) e do backend
  readonly minLength = 4;

  token = '';
  password = '';
  confirmPassword = '';
  mostrarSenha = false;
  enviando = false;
  // Link sem token, expirado ou já usado
  linkInvalido = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.linkInvalido = !this.token;
  }

  resetPassword(): void {
    if (this.password.length < this.minLength) {
      this.toastr.error(`A senha deve ter pelo menos ${this.minLength} caracteres.`);
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.toastr.error('As senhas não conferem.');
      return;
    }

    this.enviando = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.enviando = false;
        this.toastr.success('Senha redefinida! Faça login com a nova senha.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.enviando = false;
        if (error.error?.code === 'TOKEN_RESET_INVALIDO') {
          this.linkInvalido = true;
        } else {
          this.toastr.error(error.error?.message || 'Não foi possível redefinir a senha. Tente novamente.');
        }
      }
    });
  }
}
