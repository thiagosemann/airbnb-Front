import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './shared/service/authGuard';


import { LandingComponent } from './Acesso/landing/landing.component';
import { ForgotPasswordComponent } from './Acesso/forgot-password/forgot-password.component';
import { CalendarioAirbnbComponent } from './AIRBNB/calendario-airbnb/calendario-airbnb.component';
import { CameraAppComponent } from './AIRBNB/camera-app/camera-app.component';
import { ContentComponent } from './Acesso/content/content.component';
import { LoginComponent } from './Acesso/login/login.component';
import { RegisterComponent } from './Acesso/register/register.component';
import { ProfileComponent } from './Acesso/profile/profile.component';
import { CadastroPredioComponent } from './Cadastro/cadastro-predio/cadastro-predio.component';
import { CadastroApartamentosComponent } from './Cadastro/cadastro-apartamentos/cadastro-apartamentos.component';
import { UsersControlComponent } from './Cadastro/users-control/users-control.component';
import { EscalaFaxinaComponent } from './AIRBNB/escala-faxina/escala-faxina.component';
import { ControleFaxinaComponent } from './AIRBNB/controle-faxina/controle-faxina.component';
import { VistoriaComponent } from './AIRBNB/vistoria/vistoria.component';
import { ControleVistoriaComponent } from './AIRBNB/controle-vistoria/controle-vistoria.component';
import { CadastroPortariasComponent } from './Cadastro/cadastro-portarias/cadastro-portarias.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'cameraApp/:id', component: CameraAppComponent },
  { path: 'reserva/:id', component: CameraAppComponent },
  { path: 'forgotPassword', component: ForgotPasswordComponent},
  { path: 'landing', component: LandingComponent, canActivate: [AuthGuardService] },
  { path: 'content/:id', component: ContentComponent, canActivate: [AuthGuardService] },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuardService] },
  { path: 'cadastroPredio', component: CadastroPredioComponent, canActivate: [AuthGuardService] },
  { path: 'cadastroUsuario', component: UsersControlComponent, canActivate: [AuthGuardService] },
  { path: 'cadastroApartamento', component: CadastroApartamentosComponent, canActivate: [AuthGuardService] },
  { path: 'calendarioAirbnb', component: CalendarioAirbnbComponent, canActivate: [AuthGuardService]},
  { path: 'escalaFaxina', component: EscalaFaxinaComponent, canActivate: [AuthGuardService]},
  { path: 'controleFaxina', component: ControleFaxinaComponent, canActivate: [AuthGuardService]},
  { path: 'vistoria', component: VistoriaComponent, canActivate: [AuthGuardService]},
  { path: 'controle-vistoria', component: ControleVistoriaComponent, canActivate: [AuthGuardService]},
  { path: 'cadastroPortaria', component: CadastroPortariasComponent, canActivate: [AuthGuardService]},


  
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // redireciona para '/home' quando o caminho é vazio
  { path: '**', component: ContentComponent, canActivate: [AuthGuardService] }, // rota de fallback quando nenhuma outra corresponder

  // Outras rotas do seu aplicativo
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
