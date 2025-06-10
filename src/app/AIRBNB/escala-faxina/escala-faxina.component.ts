import { Component, OnInit } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { User } from 'src/app/shared/utilitarios/user';
import { forkJoin } from 'rxjs';
import { LimpezaExtra } from 'src/app/shared/utilitarios/limpezaextra';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ToastrService } from 'ngx-toastr';



@Component({
  selector: 'app-escala-faxina',
  templateUrl: './escala-faxina.component.html',
  styleUrls: ['./escala-faxina.component.css']
})
export class EscalaFaxinaComponent implements OnInit {
  faxinasHoje: ReservaAirbnb[] = [];
  faxinasFuturas: ReservaAirbnb[] = [];
  apartamentos: { id: number; nome: string }[] = [];
  tabs = [
    { id: 'hoje',          label: 'Hoje' },
    { id: 'futuras',        label: 'Futuras' },
  ];
  activeTab = 'hoje';
  objectValues = (obj: any): any[] => Object.values(obj);
  carregando: boolean = true;
  user: User | null = null; // Adicionado para armazenar o usuário atual
  constructor(private reservasService: ReservasAirbnbService,
              private authService: AuthenticationService,
              private limpezaExtraService: LimpezaExtraService,
              private apartamentosService: ApartamentoService,
              private toastr: ToastrService
            ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser(); // Obter o usuário atual
    this.carregarDados();
    this.apartamentosService.getAllApartamentos().subscribe(list => {
     this.apartamentos = list;
    });
  }

  private carregarDados(): void {
    this.carregando = true;

    let date = new Date()
    let today_day = date.getDate();
    let today_month = (date.getMonth() + 1).toString().padStart(2, '0');
    let today_year = date.getFullYear();
    let todayDate = `${today_year}-${today_month}-${today_day}`;

    let date2 = new Date();
    date2.setDate(date.getDate() + 30);
    let futureDay = date2.getDate();
    let futureMonth = (date2.getMonth() + 1).toString().padStart(2, '0');
    let futureYear = date2.getFullYear();
    let futureDate = `${futureYear}-${futureMonth}-${futureDay}`;

    let date3 = new Date();
    date3.setDate(date.getDate() + 1);
    let tomorrow_day = date3.getDate();
    let tomorrow_month = (date3.getMonth() + 1).toString().padStart(2, '0');
    let tomorrow_year = date3.getFullYear();
    let tomorrowDate = `${tomorrow_year}-${tomorrow_month}-${tomorrow_day}`;

    // Chama as três APIs simultaneamente
    forkJoin({
      hoje: this.reservasService.getFaxinasPorPeriodo(todayDate,todayDate),
      hojeExtra: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(todayDate,todayDate),
      futuras: this.reservasService.getFaxinasPorPeriodo(tomorrowDate,futureDate),
      futurasExtra: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(tomorrowDate,futureDate),
    }).subscribe({
      next: ({ hoje, hojeExtra,futuras,futurasExtra }) => {
        const normExtra = (extras: LimpezaExtra[]) =>
          extras.map(e => ({
            id:             e.id,
            apartamento_nome: e.apartamento_nome,
            apartamento_senha: e.apartamento_senha,
            
            end_data:       e.end_data,              // já em ISO (yyyy-MM-dd)
            check_out:      '11:00',                      // reserva não tem check_out
            description:    'LIMPEZA',
            faxina_userId:  e.faxina_userId,
            limpeza_realizada: e.limpeza_realizada,
            apartamento_id:e.apartamento_id,
            Observacoes:e.Observacoes
          }));
          this.faxinasHoje = this.ordenarCanceladasPorUltimo([ ...hoje, ...normExtra(hojeExtra) ]);
          this.faxinasFuturas = this.ordenarCanceladasPorUltimo([ ...futuras, ...normExtra(futurasExtra) ]);

          this.faxinasHoje = this.faxinasHoje.filter(r => r.faxina_userId === this.user!.id)
          this.faxinasHoje = this.formatDates(this.faxinasHoje);
        
          this.faxinasFuturas = this.faxinasFuturas.filter(r => r.faxina_userId === this.user!.id)
          this.faxinasFuturas = this.formatDates(this.faxinasFuturas);
      },
      error: err => {
        console.error('Erro ao carregar faxinas:', err);
        this.carregando = false;
      }
    });

  }

  updateReserva(reserva: any): void {
    // Garante que faxina_userId seja uma string vazia se for null ou undefined
    if(reserva.description == "LIMPEZA"){
      reserva.faxina_userId = reserva.faxina_userId || null;
      reserva.end_data = this.formatarDataBanco(reserva.end_data);
      this.limpezaExtraService.updateLimpezaExtra(reserva).subscribe(
        data => {
          // Ação após atualizar, se necessário
          if(reserva.limpeza_realizada){
            this.toastr.success("Limpeza Registrada!")
          }else{
            this.toastr.info("Finalização Removida!")
          }

        },
        error => {
          console.error('Erro ao atualizar reserva', error);
        }
      );
    }else{
      reserva.faxina_userId = reserva.faxina_userId || null;
      reserva.end_data = this.formatarDataBanco(reserva.end_data);
      reserva.start_date = this.formatarDataBanco(reserva.start_date);
      this.reservasService.updateReserva(reserva).subscribe(
        data => {
          // Ação após atualizar, se necessário
          if(reserva.limpeza_realizada){
            this.toastr.success("Limpeza Registrada!")
          }else{
            this.toastr.info("Finalização Removida!")
          }

        },
        error => {
          console.error('Erro ao atualizar reserva', error);
        }
      );
    }

  }

  formatarData(dataString: string): string {
    // Divide a string em [ano, mês, dia]
    const partes = dataString.split('-');
    if (partes.length !== 3) {
      // Retorna a string original caso não esteja no formato esperado
      return dataString;
    }
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`; // Já no formato dd/mm/yyyy
  }

    formatarDataBanco(dataString: string): string {
    // Divide a string em [ano, mês, dia]
    const partes = dataString.split('/');
    if (partes.length !== 3) {
      // Retorna a string original caso não esteja no formato esperado
      return dataString;
    }
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`; // Já no formato dd/mm/yyyy
  }

  calcularDiasRestantes(dataFim: string): number {
    let data: Date;
    let ajustarMaisUmDia = false;

    if (dataFim.includes('/')) {
      // Formato: dd/mm/yyyy
      const [dia, mes, ano] = dataFim.split('/').map(Number);
      data = new Date(ano, mes - 1, dia);
    } else if (dataFim.includes('-')) {
      // Formato: yyyy-mm-dd (padrão ISO)
      data = new Date(dataFim);
      ajustarMaisUmDia = true; // marca para ajustar
    } else {
      throw new Error('Formato de data inválido');
    }

    // Se for ISO, avança um dia
    if (ajustarMaisUmDia) {
      data.setDate(data.getDate() + 1);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    data.setHours(0, 0, 0, 0);

    const diffTime = data.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }




  selectTab(id: string): void {
    this.activeTab = id;
  }

  updateStatus(reserva: any, field: string, event: Event, type: string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;

    this.updateReserva(reserva)


  }


  findIfBloqued(reserva: ReservaAirbnb): string {
    return reserva.cod_reserva.includes(reserva.apartamento_nome) 
      ? 'Bloqueado' 
      : reserva.cod_reserva;
  }


  formatarTextFaxinaRealizada(realizada:boolean):string{
    if(realizada){
      return "Realizada"
    }else{
      return "Pendente"
    }

  }


  formatarCheckInMesmoDia(faxina: any | undefined): string {
    if(faxina.description == "LIMPEZA"){
      return "Limpeza Manual"
    }else if(faxina.check_in_mesmo_dia){
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

  contarFaxinasPorDia(userId: number | null | undefined, dataIso: string, lista: ReservaAirbnb[]): number {
    if (!userId) return 0;
    // Garante comparar número com número
    const uid = Number(userId);

    return lista.filter(f => {
      const fUid = Number(f.faxina_userId);           // normaliza o tipo
      const sameUser = fUid === uid;
      return sameUser && this.formatarData(f.end_data) === dataIso;
    }).length;
  }

  contarFaxinasPorLista(userId: number | null | undefined, lista: ReservaAirbnb[]): number {
      if (!userId) return 0;
      // Garante comparar número com número
      const uid = Number(userId);

      return lista.filter(f => {
        const fUid = Number(f.faxina_userId);           // normaliza o tipo
        const sameUser = fUid === uid;
        return sameUser ;
      }).length;
  }


private ordenarCanceladasPorUltimo(lista: any[]): any[] {
  return lista.sort((a, b) => {
    const aCancelada = a.description === 'CANCELADA';
    const bCancelada = b.description === 'CANCELADA';
    return Number(aCancelada) - Number(bCancelada); // false (0) vem antes de true (1)
  });
}

private formatDates(lista: any[]): any[] {
  lista.forEach(f=>{
    const data = new Date(f.end_data); 
    f.end_data = data.toLocaleDateString('pt-BR');
    const data2 = new Date(f.start_date); 
    f.start_date = data2.toLocaleDateString('pt-BR');
  })
  return lista
} 





}