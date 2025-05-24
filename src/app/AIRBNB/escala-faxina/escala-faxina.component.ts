import { Component, OnInit } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { User } from 'src/app/shared/utilitarios/user';
import { forkJoin } from 'rxjs';



@Component({
  selector: 'app-escala-faxina',
  templateUrl: './escala-faxina.component.html',
  styleUrls: ['./escala-faxina.component.css']
})
export class EscalaFaxinaComponent implements OnInit {
  faxinasHoje: ReservaAirbnb[] = [];
  faxinasSemana: ReservaAirbnb[] = [];
  faxinasFuturas: ReservaAirbnb[] = [];
  faxinasSemanaQueVem: ReservaAirbnb[] = [];
  diasDaSemana = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
  tabs = [
    { id: 'resumoEsta',   label: 'Resumo Esta Semana' },
    { id: 'resumoProxima', label: 'Resumo Semana que Vem' },
    { id: 'hoje',          label: 'Hoje' },
    { id: 'semana',        label: 'Esta Semana' },
    { id: 'proxima',       label: 'Semana que Vem' },
    { id: 'futuras',       label: 'Futuras' }
  ];
  activeTab = 'resumoEsta';
  terceirizadasResumoEsta: any = {};
  terceirizadasResumoProxima: any = {};

  mostrarSemana: 'esta' | 'proxima' = 'esta';
  objectValues = (obj: any): any[] => Object.values(obj);

  carregando: boolean = true;
  users:User[]=[]
  user: User | null = null; // Adicionado para armazenar o usuário atual



  constructor(private reservasService: ReservasAirbnbService,
              private userService: UserService,
              private authService: AuthenticationService,
            ) { }

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
    this.carregando = true;

    // Chama as três APIs simultaneamente
    forkJoin({
      hoje: this.reservasService.getReservasEncerraHoje(),
      semana: this.reservasService.getReservasEncerraSemana(),
      futuras: this.reservasService.getFaxinasFuturasUmMes(),
      semanaQueVem: this.reservasService.getReservasEncerraSemanaQueVem()
    }).subscribe({
      next: ({ hoje, semana, futuras, semanaQueVem }) => {
        if (this.user?.role === 'tercerizado') {
          this.faxinasHoje = hoje.filter(r => r.faxina_userId === this.user!.id);
          this.faxinasSemana = semana.filter(r => r.faxina_userId === this.user!.id);
          this.faxinasSemanaQueVem = semanaQueVem.filter(r => r.faxina_userId === this.user!.id);
        } else {
          this.faxinasHoje = hoje;
          this.faxinasSemana = semana;
          this.faxinasFuturas = futuras;
          this.faxinasSemanaQueVem = semanaQueVem;
          this.calcularResumoFaxinasPorTerceirizada(semana, 'Esta', 'Esta');
          this.calcularResumoFaxinasPorTerceirizada(semanaQueVem, 'Proxima', 'Próxima');
        }
        this.carregando = false;
      },
      error: err => {
        console.error('Erro ao carregar faxinas:', err);
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

  formatarData(dataString: string): string {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR'); // Isso já considera o fuso horário local
  }
  calcularDiasRestantes(dataFim: string): number {
    const hoje = new Date();
    const data = new Date(dataFim);
    const diffTime = data.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  selectTab(id: string): void {
    this.activeTab = id;
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
  getDiaDaSemana(dataStr: string): string {
    // Divide a string em [dia, mês, ano]
    const partes = dataStr.split('/');
    if (partes.length !== 3) {
      throw new Error(`Formato de data inválido: ${dataStr}`);
    }

    const dia   = parseInt(partes[0], 10);
    const mes   = parseInt(partes[1], 10) - 1; // JS: meses de 0 (jan) a 11 (dez)
    const ano   = parseInt(partes[2], 10);

    const data = new Date(ano, mes, dia);
    if (isNaN(data.getTime())) {
      throw new Error(`Data inválida: ${dataStr}`);
    }

    const nomes = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];

    return nomes[data.getDay()];
  }
  calcularResumoFaxinasPorTerceirizada(faxinas: ReservaAirbnb[],prop: 'Esta' | 'Proxima', label: string ): void {
    const resumoKey = prop === 'Esta' ? 'terceirizadasResumoEsta' : 'terceirizadasResumoProxima';
    this[resumoKey] = {};

    faxinas.forEach(faxina => {
      if (!faxina.faxina_userId) { return; }
      const dia = this.getDiaDaSemana(this.formatarData(faxina.end_data));
      const uId = faxina.faxina_userId.toString();

      if (!this[resumoKey][uId]) {
        const u = this.users.find(x => x.id === faxina.faxina_userId);
        this[resumoKey][uId] = { nome: u?.first_name || 'Desconhecido', dias: {} };
      }
      this[resumoKey][uId].dias[dia] = (this[resumoKey][uId].dias[dia] || 0) + 1;
    });
  }
  contarFaxinasPorDia(userId: number | null | undefined, dataIso: string, lista: ReservaAirbnb[]): number {
    if (!userId) { return 0; }

    return lista.filter(f => {
      // 1) compara userId
      const sameUser = Number(f.faxina_userId) === userId;

      // 2) compara data (supondo que f.end_data já esteja no ISO 'YYYY-MM-DD')
      const sameDate = f.end_data === dataIso;

      return sameUser && sameDate;
    }).length;
  }




}