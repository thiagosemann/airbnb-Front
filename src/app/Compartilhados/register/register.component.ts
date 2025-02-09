import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ValidatorFn, AbstractControl, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../shared/utilitarios/user';
import { UserService } from '../../shared/service/Banco_de_Dados/user_service';


export const ConfirmValidator = (controlName: string, matchingControlName: string): ValidatorFn => {
  return (control: AbstractControl): {[key: string]: boolean} | null => {
    const input = control.get(controlName);
    const matchingInput = control.get(matchingControlName);
    return (input && matchingInput && input.value !== matchingInput.value) ? {'mismatch': true} : null;
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
  buildingName: string = '';
  errorMessages: { [key: string]: string } = {
    first_name: 'Insira o primeiro nome',
    last_name: 'Insira o sobrenome',
    cpf: 'Insira o CPF',
    telefone: 'Insira o telefone',
    data_nasc: 'Insira a data de nascimento',
    apt_name: 'Insira o nome apartamento',
    emailGroup: 'Verifique os e-mails digitados',
    passwordGroup: 'Verifique as senhas digitadas'
  };

  
  constructor(private formBuilder: FormBuilder,
              private userService: UserService,
              private toastr: ToastrService,
              private route: ActivatedRoute,
              private router: Router,
  ) {}

  ngOnInit(): void {
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
      data_nasc: ['', Validators.required],
      telefone: ['', Validators.required],
      apt_name: ['', Validators.required], // Novo campo "apt_name" adicionado ao formulário
      credito: [10]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { emailGroup, passwordGroup, ...rest } = this.registerForm.value;
  
      this.user = {
        ...rest,
        email: emailGroup.email,
        password: passwordGroup.password,
      };
      
      this.user.data_nasc = new Date(this.user.data_nasc!);
      this.user.role = 'usuario';    
      this.user.building_id = 16;
      this.userService.addUser(this.user).subscribe(
        (res) => {
          this.resetForm();
          this.router.navigate(['/login']);
        },
        (err) => {
          console.log(err)
          this.toastr.error(err.error.error);
        }
      );
    } else {
      for (const controlName in this.registerForm.controls) {
        const control = this.registerForm.get(controlName);
        if (control && control.invalid) {
            this.toastr.error(this.errorMessages[controlName]);
        }
      }
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
      data_nasc: '',
      telefone: '',
      building_id: null,
      role:'',
      credito: 10,
    });
  }
}



