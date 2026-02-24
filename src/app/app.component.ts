import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Forest';
  showNavBar: boolean = true;
  showNavBarAirbnb: boolean = false;

  constructor(private router: Router) { }

  semNavBar: string[] = [
    'login',
    'cameraApp',
    'reservasAirbnb',
    'forgotPassword',
    'landing',
    'register',
  ];

  navBarAirbnb: string[] = [
    'calendarioAirbnb',
    'checkouts-diarios',
    'calendarioMobile',
    'calendario',
    'calendarioSemPasta',
    'cadastroPredio',
    'cadastroApartamento',
    'cadastroProprietarios',
    'cadastroUsuario',
    'escalaFaxina',
    'escalaFaxinaAdmin',
    'ticketReembolso',
    'controleTicketReembolso',
    'controleFaxina',
    'vistoria',
    'controle-vistoria',
    'cadastroPortaria',
    'uploadRelatorioCSV',
    'relatoriosGanhos',
    'profile',
    'controleNodeMcuPortas',
    'nps-limpeza',
    'migrarIcal',
    'relatorioNF',
    'controleDemandas',
    'suasDemandas',
    'performance'

  ];

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const currentRoute = this.router.url.split('/')[1]; // Obtém o primeiro segmento da rota

        // Verifica se a rota atual está na lista de rotas sem navbar
        if (this.semNavBar.includes(currentRoute)) {
          this.showNavBar = false;
          this.showNavBarAirbnb = false;
        }
        // Verifica se a rota atual está na lista de rotas com navbar Airbnb
        else if (this.navBarAirbnb.includes(currentRoute)) {
          this.showNavBar = false;
          this.showNavBarAirbnb = true;
        }
        // Caso a rota não esteja em nenhuma das listas, decide o que fazer (opcional)
        else {
          this.showNavBar = true; // ou false, dependendo do comportamento desejado
          this.showNavBarAirbnb = false;
        }
      }
    });
  }
}