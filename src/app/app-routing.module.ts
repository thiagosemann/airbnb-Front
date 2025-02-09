import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './shared/service/authGuard';


import { LandingComponent } from './Compartilhados/landing/landing.component';
import { ForgotPasswordComponent } from './Compartilhados/forgot-password/forgot-password.component';
import { CalendarioAirbnbComponent } from './AIRBNB/calendario-airbnb/calendario-airbnb.component';
import { CameraAppComponent } from './AIRBNB/camera-app/camera-app.component';
import { ContentComponent } from './Compartilhados/content/content.component';
import { LoginComponent } from './Compartilhados/login/login.component';
import { RegisterComponent } from './Compartilhados/register/register.component';
import { ProfileComponent } from './Compartilhados/profile/profile.component';


const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'cameraApp/:id', component: CameraAppComponent },
  { path: 'reservasAirbnb/:id', component: CameraAppComponent },
  { path: 'forgotPassword', component: ForgotPasswordComponent},
  { path: 'landing', component: LandingComponent, canActivate: [AuthGuardService] },
  { path: 'content/:id', component: ContentComponent, canActivate: [AuthGuardService] },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuardService] },
  { path: 'calendarioAirbnb', component: CalendarioAirbnbComponent, canActivate: [AuthGuardService]},
  { path: '', redirectTo: '/content', pathMatch: 'full' }, // redireciona para '/home' quando o caminho é vazio
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
