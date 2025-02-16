import { Component, OnInit } from '@angular/core';

import { User } from 'src/app/shared/utilitarios/user';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';

@Component({
  selector: 'app-controle-faxina',
  templateUrl: './controle-faxina.component.html',
  styleUrls: ['./controle-faxina.component.css']
})
export class ControleFaxinaComponent implements OnInit {
  apartamentos: Apartamento[] = [];
  activeTab: string = 'prioridades';
  users:User[]=[]
  constructor(
    private userService: UserService,
    private reservasService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService
  ) {}

  ngOnInit(): void {
    this.getApartamentos();
    this.getUsersByRole();
    this.activeTab = 'prioridades';
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }
  getApartamentos():void{
    console.log("Entrou")
    this.apartamentoService.getAllApartamentos().subscribe(apartamentos => {
      // Ordena os apartamentos por nome em ordem alfabética
      this.apartamentos = apartamentos.sort((a, b) => a.nome.localeCompare(b.nome));
    });
  }

  getUsersByRole():void{
    this.userService.getUsersByRole('tercerizado').subscribe(
      users => {
        console.log(users)  
        this.users = users;
      },
      error => {
        console.error('Erro ao obter os eventos do calendário', error);
      }
    );
  }
  onPriorityChange(apartamento: Apartamento): void {  
    console.log(apartamento)

    this.apartamentoService.updateApartamento(apartamento).subscribe({
      next: () => {
      },
      error: (error) => {
        this.getApartamentos(); // Restaura valores originais
      }
    });
  }
  
}