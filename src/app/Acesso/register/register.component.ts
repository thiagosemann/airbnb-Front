import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ValidatorFn, AbstractControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { User } from '../../shared/utilitarios/user';
import { UserService } from '../../shared/service/Banco_de_Dados/user_service';

// Validador para comparar os campos de e-mail e senha
export const ConfirmValidator = (controlName: string, matchingControlName: string): ValidatorFn => {
  return (control: AbstractControl): { [key: string]: boolean } | null => {
    const input = control.get(controlName);
    const matchingInput = control.get(matchingControlName);
    return (input && matchingInput && input.value !== matchingInput.value)
      ? { 'mismatch': true }
      : null;
  };
};

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  user!: User;
  errorMessages: { [key: string]: string } = {
    first_name: 'Insira o primeiro nome',
    last_name: 'Insira o sobrenome',
    cpf: 'Insira o CPF',
    telefone: 'Insira o telefone',
    emailGroup: 'Verifique os e-mails digitados',
    passwordGroup: 'Verifique as senhas digitadas',
    role: 'Selecione uma função'
  };

  constructor(
    private formBuilder: FormBuilder,
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Formulário ajustado com os campos necessários, incluindo "role"
    this.registerForm = this.formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      cpf: ['', Validators.required],
      emailGroup: this.formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        confirmEmail: ['', [Validators.required, Validators.email]]
      }, { validator: ConfirmValidator('email', 'confirmEmail') }),
      passwordGroup: this.formBuilder.group({
        password: ['', [Validators.required, Validators.minLength(4)]],
        confirmPassword: ['', Validators.required]
      }, { validator: ConfirmValidator('password', 'confirmPassword') }),
      telefone: ['', Validators.required],
      role: ['', Validators.required]  // Novo campo para selecionar a role
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { emailGroup, passwordGroup, role, ...rest } = this.registerForm.value;

      // Mapeando os campos para os nomes esperados pelo backend
      this.user = {
        first_name: rest.first_name,
        last_name: rest.last_name,
        cpf: rest.cpf,
        email: emailGroup.email,
        password: passwordGroup.password,
        Telefone: rest.telefone, // Atenção à nomenclatura (conforme o model)
        role: role              // Valor selecionado no select
      };

      this.userService.addUser(this.user).subscribe(
        (res) => {
          this.resetForm();
          this.router.navigate(['/login']);
        },
        (err) => {
          console.error(err);
          this.toastr.error(err.error.error);
        }
      );
    } else {
      // Exibe as mensagens de erro para cada controle inválido
      Object.keys(this.registerForm.controls).forEach(controlName => {
        const control = this.registerForm.get(controlName);
        if (control && control.invalid) {
          this.toastr.error(this.errorMessages[controlName]);
        }
      });
    }
  }

  resetForm(): void {
    this.registerForm.reset({
      first_name: '',
      last_name: '',
      cpf: '',
      emailGroup: {
        email: '',
        confirmEmail: ''
      },
      passwordGroup: {
        password: '',
        confirmPassword: ''
      },
      telefone: '',
      role: ''
    });
  }
}
