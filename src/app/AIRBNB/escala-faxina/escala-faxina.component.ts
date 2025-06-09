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
  styleUrls: ['./escala-faxina.component.css', './escala-faxina2.component.css', './escala-faxina3.component.css']
})
export class EscalaFaxinaComponent implements OnInit {
  faxinasHoje: ReservaAirbnb[] = [];
  faxinasSemana: ReservaAirbnb[] = [];
  faxinasFuturas: ReservaAirbnb[] = [];
  faxinasSemanaQueVem: ReservaAirbnb[] = [];
  showModal:boolean = false;
   limpezaExtra: LimpezaExtra = {
    apartamento_id: 0,
    end_data: ''
    // os demais campos opcionais já estarão undefined por padrão
  };
  apartamentos: { id: number; nome: string }[] = [];

  diasDaSemana = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
  tabs = [
    { id: 'resumoEsta',    label: 'Resumo Esta Semana' },
    { id: 'resumoProxima', label: 'Resumo Semana que Vem' },
    { id: 'hoje',          label: 'Hoje' },
    { id: 'semana',        label: 'Esta Semana' },
    { id: 'proxima',       label: 'Semana que Vem' },
    { id: 'futuras',       label: 'Futuras' }
  ];
  activeTab = 'hoje';
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
              private limpezaExtraService: LimpezaExtraService,
              private apartamentosService: ApartamentoService,
              private toastr: ToastrService
            ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser(); // Obter o usuário atual

    this.carregarDados();
    this.getUsersByRole();

    this.apartamentosService.getAllApartamentos().subscribe(list => {
     this.apartamentos = list;
    });
  }

  getUsersByRole():void{
    this.userService.getUsersByRole('tercerizado').subscribe(
      users => {
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
      hojeExtra: this.limpezaExtraService.getLimpezasExtrasHoje(),
      semana: this.reservasService.getReservasEncerraSemana(),
      semanaExtra: this.limpezaExtraService.getLimpezasExtrasSemana(),
      futuras: this.reservasService.getFaxinasFuturasUmMes(),
      semanaQueVem: this.reservasService.getReservasEncerraSemanaQueVem(),
      semanaQueVemExtra: this.limpezaExtraService.getLimpezasExtrasSemanaQueVem()

    }).subscribe({
      next: ({ hoje, hojeExtra, semana, semanaExtra, semanaQueVem, semanaQueVemExtra,futuras }) => {
        console.log(hojeExtra)
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
          this.faxinasSemana = this.ordenarCanceladasPorUltimo([ ...semana, ...normExtra(semanaExtra) ]);
          this.faxinasFuturas = this.ordenarCanceladasPorUltimo([ ...futuras, ...normExtra(futuras) ]);
          this.faxinasSemanaQueVem = this.ordenarCanceladasPorUltimo([ ...semanaQueVem, ...normExtra(semanaQueVemExtra) ]);

        if (this.user?.role === 'tercerizado') {
          this.faxinasHoje = this.faxinasHoje.filter(r => r.faxina_userId === this.user!.id)
          this.faxinasSemana = this.faxinasSemana.filter(r => r.faxina_userId === this.user!.id)
          this.faxinasSemanaQueVem = this.faxinasSemanaQueVem.filter(r => r.faxina_userId === this.user!.id)
          this.faxinasHoje = this.formatDates(this.faxinasHoje);
          this.faxinasSemana = this.formatDates(this.faxinasSemana);
          this.faxinasSemanaQueVem = this.formatDates(this.faxinasSemanaQueVem);
        } else {
          this.faxinasHoje = this.formatDates(this.faxinasHoje);
          this.faxinasSemana = this.formatDates(this.faxinasSemana);
          this.faxinasFuturas = this.formatDates(this.faxinasFuturas);
          this.faxinasSemanaQueVem = this.formatDates(this.faxinasSemanaQueVem);

          this.calcularResumoFaxinasPorTerceirizada(semana, 'Esta', 'Esta');
          this.calcularResumoFaxinasPorTerceirizada(semanaQueVem, 'Proxima', 'Próxima');
        }
        console.log(this.faxinasHoje)
      },
      error: err => {
        console.error('Erro ao carregar faxinas:', err);
        this.carregando = false;
      }
    });

  }

  updateReserva(reserva: any): void {
    // Garante que faxina_userId seja uma string vazia se for null ou undefined
    console.log(reserva)
    if(reserva.description == "LIMPEZA"){
      reserva.faxina_userId = reserva.faxina_userId || null;
      reserva.end_data = this.formatarDataBanco(reserva.end_data);
      this.limpezaExtraService.updateLimpezaExtra(reserva).subscribe(
        data => {
          // Ação após atualizar, se necessário
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

  abrirModal(): void {
    this.showModal = true;
  }

  fecharModal(): void {
    this.showModal = false;
  }

  saveLimpezaExtra(): void {
  // Ajusta datas para o formato do banco, se necessário
  // (pode reutilizar formatarDataBanco)
  this.limpezaExtra.end_data   = this.formatarDataBanco(this.limpezaExtra.end_data);

  this.limpezaExtraService.createLimpezaExtra(this.limpezaExtra)
    .subscribe({
      next: result => {
        // opcional: inserir ID retornado
        this.limpezaExtra.id = result.insertId;
        // atualiza a lista de faxinas, por exemplo:
        this.carregarDados();
        // fecha o modal
        this.fecharModal();
        // reseta o formulário
        this.limpezaExtra = {
          apartamento_id: 0,
          end_data: ''
        };
        this.toastr.success("Nova limpeza cadastrada")
      },
      error: err => {
        console.error('Erro ao criar limpeza extra', err);
      }
    });
}


}