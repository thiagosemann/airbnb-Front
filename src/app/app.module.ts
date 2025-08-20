
import { ToastrModule } from 'ngx-toastr';
import { NgxMaskModule } from 'ngx-mask';
import { NgChartsModule } from 'ng2-charts';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { OrdenarPorPrecoPipe } from '../app/shared/pipes/ordenar-por-preco.pipe'; // ajuste o caminho conforme necessário
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LandingComponent } from './Acesso/landing/landing.component';
import { ForgotPasswordComponent } from './Acesso/forgot-password/forgot-password.component';

import { CalendarioAirbnbComponent } from './AIRBNB/calendario-airbnb/calendario-airbnb.component';
import { CameraAppComponent } from './AIRBNB/camera-app/camera-app.component';
import { ContentComponent } from './Acesso/content/content.component';
import { LoginComponent } from './Acesso/login/login.component';
import { ProfileComponent } from './Acesso/profile/profile.component';
import { RegisterComponent } from './Acesso/register/register.component';
import { NavBarAirbnbComponent } from './AIRBNB/nav-bar-airbnb/nav-bar-airbnb.component';
import { CadastroPredioComponent } from './Cadastro/cadastro-predio/cadastro-predio.component';
import { CadastroApartamentosComponent } from './Cadastro/cadastro-apartamentos/cadastro-apartamentos.component';
import { UsersControlComponent } from './Cadastro/users-control/users-control.component';
import { EscalaFaxinaComponent } from './AIRBNB/escala-faxina/escala-faxina.component';
import { ControleFaxinaComponent } from './AIRBNB/controle-faxina/controle-faxina.component';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VistoriaComponent } from './AIRBNB/vistoria/vistoria.component';
import { ControleVistoriaComponent } from './AIRBNB/controle-vistoria/controle-vistoria.component';
import { CadastroPortariasComponent } from './Cadastro/cadastro-portarias/cadastro-portarias.component';
import { RelatorioGanhosComponent } from './AIRBNB/Relatorios/relatorio-ganhos/relatorio-ganhos.component';
import { UpladoCSVRelatorioComponent } from './AIRBNB/Relatorios/uplado-csvrelatorio/uplado-csvrelatorio.component';
import { EscalaFaxina2Component } from './AIRBNB/escala-faxina2/escala-faxina2.component';
import { CalendarioComponent } from './AIRBNB/calendario/calendario.component';
import { CalendarioPorApartamentoComponent } from './AIRBNB/calendario-por-apartamento/calendario-por-apartamento.component';
import { TicketReembolsoComponent } from './AIRBNB/ticketReembolso/ticket-reembolso/ticket-reembolso.component';
import { ControleTicketReembolsoComponent } from './AIRBNB/ticketReembolso/controle-ticket-reembolso/controle-ticket-reembolso.component';
import { CadastroProprietariosComponent } from './Cadastro/cadastro-proprietarios/cadastro-proprietarios.component';
import { AceiteTicketReembolsoProprietarioComponent } from './AIRBNB/ticketReembolso/aceite-ticket-reembolso-proprietario/aceite-ticket-reembolso-proprietario.component';
import { QrcodescannerComponent } from './AIRBNB/qrcodescanner/qrcodescanner.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    LandingComponent,
    ContentComponent,
    ForgotPasswordComponent,
    ProfileComponent,
    RegisterComponent,
    OrdenarPorPrecoPipe,
    CalendarioAirbnbComponent,
    CameraAppComponent,
    NavBarAirbnbComponent,
    CadastroPredioComponent,
    CadastroApartamentosComponent,
    UsersControlComponent,
    EscalaFaxinaComponent,
    ControleFaxinaComponent,
    VistoriaComponent,
    ControleVistoriaComponent,
    CadastroPortariasComponent,
    RelatorioGanhosComponent,
    UpladoCSVRelatorioComponent,
    EscalaFaxina2Component,
    CalendarioComponent,
    CalendarioPorApartamentoComponent,
    TicketReembolsoComponent,
    ControleTicketReembolsoComponent,
    CadastroProprietariosComponent,
    AceiteTicketReembolsoProprietarioComponent,
    QrcodescannerComponent
    ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    NgxMaskModule.forRoot(),
    NgChartsModule,
    ZXingScannerModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
