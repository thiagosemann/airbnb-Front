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
import { UpladoCSVRelatorioComponent } from './AIRBNB/Relatorios/uplado-csvrelatorio/uplado-csvrelatorio.component';
import { RelatorioGanhosComponent } from './AIRBNB/Relatorios/relatorio-ganhos/relatorio-ganhos.component';
import { EscalaFaxina2Component } from './AIRBNB/escala-faxina2/escala-faxina2.component';
import { CalendarioComponent } from './AIRBNB/calendario/calendario.component';
import { CalendarioPorApartamentoComponent } from './AIRBNB/calendario-por-apartamento/calendario-por-apartamento.component';
import { TicketReembolsoComponent } from './AIRBNB/ticketReembolso/ticket-reembolso/ticket-reembolso.component';
import { ControleTicketReembolsoComponent } from './AIRBNB/ticketReembolso/controle-ticket-reembolso/controle-ticket-reembolso.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'cameraApp/:id', component: CameraAppComponent },
  { path: 'reserva/:id', component: CameraAppComponent },
  { path: 'forgotPassword', component: ForgotPasswordComponent},
  { path: 'landing', component: LandingComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'content/:id', component: ContentComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'cadastroPredio', component: CadastroPredioComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'cadastroUsuario', component: UsersControlComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'cadastroApartamento', component: CadastroApartamentosComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'calendarioAirbnb', component: CalendarioAirbnbComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'calendario', component: CalendarioComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'calendarioDetalhado/:cod', component: CalendarioPorApartamentoComponent },
  { path: 'ticketReembolso', component: TicketReembolsoComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'controleTicketReembolso', component: ControleTicketReembolsoComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },

  { path: 'escalaFaxina', component: EscalaFaxinaComponent, canActivate: [AuthGuardService],data: { role: 'tercerizado' } },
  { path: 'escalaFaxinaAdmin', component: EscalaFaxina2Component, canActivate: [AuthGuardService],data: { role: 'admin'} },

  { path: 'controleFaxina', component: ControleFaxinaComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'vistoria', component: VistoriaComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'controle-vistoria', component: ControleVistoriaComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'cadastroPortaria', component: CadastroPortariasComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'uploadRelatorioCSV', component: UpladoCSVRelatorioComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  { path: 'relatoriosGanhos', component: RelatorioGanhosComponent, canActivate: [AuthGuardService],data: { role: 'admin' } },
  
  { path: '', redirectTo: '/login', pathMatch: 'full' }, // redireciona para '/home' quando o caminho é vazio
  { path: '**', component: ContentComponent, canActivate: [AuthGuardService],data: { role: 'admin' } }, // rota de fallback quando nenhuma outra corresponder

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
