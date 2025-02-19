import { Component, OnInit } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { User } from 'src/app/shared/utilitarios/user';

type SectionKey = 'hoje' | 'semana' | 'futuras' | 'bloqueadas';

@Component({
  selector: 'app-escala-faxina',
  templateUrl: './escala-faxina.component.html',
  styleUrls: ['./escala-faxina.component.css','./escala-faxina2.component.css']
})
export class EscalaFaxinaComponent implements OnInit {
  faxinasHoje: ReservaAirbnb[] = [];
  faxinasSemana: ReservaAirbnb[] = [];
  faxinasFuturas: ReservaAirbnb[] = [];
  carregando: boolean = true;
  faxinasBloqueadas: ReservaAirbnb[] = [];
  users:User[]=[]
  user: User | null = null; // Adicionado para armazenar o usuário atual

  sections: { [key in SectionKey]: boolean } = {
    hoje: true,
    semana: false,
    futuras: false,
    bloqueadas: false
  };

  constructor(private reservasService: ReservasAirbnbService,
              private userService: UserService,
              private authService: AuthenticationService) { }

  ngOnInit(): void {
    this.user = this.authService.getUser(); // Obter o usuário atual

    this.carregarDados();
    this.getUsersByRole();
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
  private carregarDados(): void {
    this.reservasService.getAllReservas().subscribe({
      next: (reservas) => {
        this.filtrarReservas(reservas);
        this.carregando = false;
      },
      error: (erro) => {
        console.error('Erro ao carregar reservas:', erro);
        this.carregando = false;
      }
    });
  }

  updateRserva(reserva: ReservaAirbnb): void {
    // Garante que faxina_userId seja uma string vazia se for null ou undefined
    reserva.faxina_userId = reserva.faxina_userId || null;
    
    reserva.start_date = this.formatarDataBanco(reserva.start_date);
    reserva.end_data = this.formatarDataBanco(reserva.end_data);
  
    this.reservasService.updateReserva(reserva).subscribe(
      data => {
        // Ação após atualizar, se necessário
      },
      error => {
        console.error('Erro ao atualizar reserva', error);
      }
    );
  }

  private filtrarReservas(reservas: ReservaAirbnb[]): void {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
  
    reservas.forEach(reserva => {
      // Filtrar por faxina_userId se o usuário for tercerizado
      if (this.user?.role === 'tercerizado' && reserva.faxina_userId !== this.user.id) {
        return;
      }
  
      // Verificar se há um check-in no mesmo dia do check-out desta reserva
      reserva.check_in_mesmo_dia = reservas.some(otherReserva =>
        otherReserva.apartamento_id === reserva.apartamento_id &&
        otherReserva.start_date === reserva.end_data &&
        otherReserva.id !== reserva.id // Evitar comparar com a mesma reserva
      );
  
      if (this.isBloqueado(reserva)) {
        this.faxinasBloqueadas.push(reserva);
        return;
      }
  
      const dataFim = new Date(reserva.end_data);
      dataFim.setHours(0, 0, 0, 0);
      
      const diffTime = dataFim.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
      if (diffDays === 0) {
        this.faxinasHoje.push(reserva);
      } else if (diffDays > 0 && diffDays <= 7) {
        this.faxinasSemana.push(reserva);
      } else if (diffDays > 7) {
        this.faxinasFuturas.push(reserva);
      }
    });
  
    // Ordenar faxinasHoje pelo nome do apartamento
    this.faxinasHoje.sort((a, b) => {
      const nomeA = a.apartamento_nome || '';
      const nomeB = b.apartamento_nome || '';
      return nomeA.localeCompare(nomeB);
    });
    this.faxinasSemana.sort((a, b) => {
      const dataA = a.end_data ? new Date(a.end_data).getTime() : 0;
      const dataB = b.end_data ? new Date(b.end_data).getTime() : 0;
      return dataA - dataB;
    });
  }

// Adicione este método
private isBloqueado(reserva: ReservaAirbnb): boolean {
  return reserva.cod_reserva.includes(reserva.apartamento_nome);
}

  formatarData(dataString: string): string {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }

  calcularDiasRestantes(dataFim: string): number {
    const hoje = new Date();
    const data = new Date(dataFim);
    const diffTime = data.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  toggleSection(section: SectionKey): void {
    this.sections[section] = !this.sections[section];
  }

  updateStatus(reserva: any, field: string, event: Event, type: string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;

    this.updateRserva(reserva)


  }


  findIfBloqued(reserva: ReservaAirbnb): string {
    return reserva.cod_reserva.includes(reserva.apartamento_nome) 
      ? 'Bloqueado' 
      : reserva.cod_reserva;
  }
  formatarDataBanco(dataString: string): string {
    const data = new Date(dataString);
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const ano = data.getUTCFullYear();
    return `${ano}-${mes}-${dia}`;
  }
  formatarTextFaxinaRealizada(realizada:boolean):string{
    if(realizada){
      return "Realizada"
    }else{
      return "Pendente"
    }

  }


  formatarCheckInMesmoDia(check_in_mesmo_dia: boolean | undefined): string {
    if(check_in_mesmo_dia){
      return "Entram Hoje"
    }else{
      return "Não Entram Hoje"
    }
  }
}