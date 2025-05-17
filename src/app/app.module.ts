
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
