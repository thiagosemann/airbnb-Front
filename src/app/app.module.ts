
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

import { CalendarioAirbnbComponent } from './AIRBNB/Diario/calendario-airbnb/calendario-airbnb.component';
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
import { CommonModule } from '@angular/common';
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
import { ControlePortasComponent } from './AIRBNB/controle-portas/controle-portas.component';
import { NpsLimpezaComponent } from './AIRBNB/nps-limpeza/nps-limpeza.component';
import { NpsLimpezaHospedeComponent } from './AIRBNB/nps-limpeza-hospede/nps-limpeza-hospede.component';
import { CalendarioSemPastasComponent } from './AIRBNB/Calendario-Forest/calendario-sem-pastas/calendario-sem-pastas.component';
import { CadastroUsuarioSingleComponent } from './Cadastro/cadastro-usuario-single/cadastro-usuario-single.component';
import { CadastroCredencialComponent } from './Cadastro/cadastro-credencial/cadastro-credencial.component';
import { MigrarICALComponent } from './AIRBNB/migrar-ical/migrar-ical.component';
import { CalendarioMobileComponent } from './AIRBNB/calendario-mobile/calendario-mobile.component';
import { CheckoutsDiariosComponent } from './AIRBNB/checkouts-diarios/checkouts-diarios.component';
import { RelatorioNFComponent } from './AIRBNB/Relatorios/relatorio-nf/relatorio-nf.component';
import { ControleDemandasComponent } from './AIRBNB/Demandas/controle-demandas/controle-demandas.component';
import { SuasDemandasComponent } from './AIRBNB/Demandas/suas-demandas/suas-demandas.component';
import { PrediosComLimpezaComponent } from './AIRBNB/Diario/predios-com-limpeza/predios-com-limpeza.component';
import { CriadorReservaCalendarioComponent } from './AIRBNB/Calendario-Forest/criador-reserva-calendario/criador-reserva-calendario.component';
import { ForestLandingComponent } from './landing/landing.component';

// Reservar Components
import { ReservarComponent } from './Reservar/reservar.component';
import { ReservasHeaderComponent } from './Reservar/reservas-header/reservas-header.component';
import { ReservasFiltersComponent } from './Reservar/reservas-filters/reservas-filters.component';
import { ReservasListComponent } from './Reservar/reservas-list/reservas-list.component';
import { ReservaCardComponent } from './Reservar/reserva-card/reserva-card.component';
import { ReservaModalComponent } from './Reservar/reserva-modal/reserva-modal.component';

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
    QrcodescannerComponent,
    ControlePortasComponent,
    NpsLimpezaComponent,
    NpsLimpezaHospedeComponent,
    CalendarioSemPastasComponent,
    CadastroUsuarioSingleComponent,
    CadastroCredencialComponent,
    MigrarICALComponent,
    CalendarioMobileComponent,
    CheckoutsDiariosComponent,
    RelatorioNFComponent,
    ControleDemandasComponent,
    SuasDemandasComponent,
    PrediosComLimpezaComponent,
    CriadorReservaCalendarioComponent,
    ForestLandingComponent,
    // Reservar Components
    ReservarComponent,
    ReservasHeaderComponent,
    ReservasFiltersComponent,
    ReservasListComponent,
    ReservaCardComponent,
    ReservaModalComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
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
export class AppModule { }
