import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';

@Component({
  selector: 'app-nav-bar-airbnb',
  templateUrl: './nav-bar-airbnb.component.html',
  styleUrls: ['./nav-bar-airbnb.component.css']
})
export class NavBarAirbnbComponent {
  user: any = null;
  isMenuOpen = false;
  isDesktopView = true;
  currentRoute: string = ''; // Variável para armazenar a rota atual
  constructor(private authService: AuthenticationService,
              private router: Router, 
              private toastr: ToastrService,
 
            ) {
    // Adicionamos o evento de redimensionamento (resize) para atualizar a exibição do menu quando a janela for redimensionada
    window.addEventListener('resize', () => this.checkViewport());
  }
  
 ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.toastr.error('Deslogado.');
    this.router.navigate(['/login']);
  }
  calendarioAirbnb(): void {
    this.router.navigate(['/calendarioAirbnb']);
  }
  calendarioMisto(): void {
    this.router.navigate(['/calendario']);
  }
  cadastroPredio(): void {
    this.router.navigate(['/cadastroPredio']);
  }
  profile(): void {
    this.router.navigate(['/profile']);
  }
  cadastroApartamento(): void {
    this.router.navigate(['/cadastroApartamento']);
  }
  cadastroUsuario(): void {
    this.router.navigate(['/cadastroUsuario']);
  }
  escalaFaxinaAdmin(): void {
    this.router.navigate(['/escalaFaxinaAdmin']);
  }
  escalaFaxina(): void {
    this.router.navigate(['/escalaFaxina']);
  }
  controleFaxina(): void {
    this.router.navigate(['/controleFaxina']);
  }
  vistoria(): void {
    this.router.navigate(['/vistoria']);
  }
  controleVistoria(): void {
    this.router.navigate(['/controle-vistoria']);
  } 

  ticket(): void {
    this.router.navigate(['/ticketReembolso']);
  }
  controleTicket(): void {
    this.router.navigate(['/controleTicketReembolso']);
  } 

  cadastroPortarias():void{
    this.router.navigate(['/cadastroPortaria']);
  }
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  subirCSVRelatorio(): void {
    this.router.navigate(['/uploadRelatorioCSV']);
  }
  relatorioGanhos(): void {
    this.router.navigate(['/relatoriosGanhos']);
  }


  private checkViewport(): void {
    const width = window.innerWidth;
    this.isDesktopView = width > 990;

    if (this.isDesktopView) {
      this.isMenuOpen = false;
    }
  }
}
