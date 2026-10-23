import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from '../../shared/service/Banco_de_Dados/authentication';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  enviando = false;
  enviado = false;

  constructor(private authService: AuthenticationService, private toastr: ToastrService) {}

  forgotPassword(): void {
    const email = this.email.trim();
    if (!email) {
      this.toastr.error('Digite o e-mail!');
      return;
    }

    this.enviando = true;
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.enviando = false;
        this.enviado = true;
      },
      error: (error) => {
        this.enviando = false;
        this.toastr.error(error.error?.message || 'Não foi possível enviar o link. Tente novamente.');
      }
    });
  }
}
