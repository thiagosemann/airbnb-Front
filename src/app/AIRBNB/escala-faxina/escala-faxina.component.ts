import { Component, OnInit } from '@angular/core';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { User } from 'src/app/shared/utilitarios/user';
import { forkJoin } from 'rxjs';
import { LimpezaExtra } from 'src/app/shared/utilitarios/limpezaextra';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-escala-faxina',
  templateUrl: './escala-faxina.component.html',
  styleUrls: ['./escala-faxina.component.css','./escala-faxinaCssExtra.component.css']
})
export class EscalaFaxinaComponent implements OnInit {
  faxinasHoje: ReservaAirbnb[] = [];
  faxinasFuturas: ReservaAirbnb[] = [];
  tabs = [
    { id: 'hoje',          label: 'Hoje' },
    { id: 'futuras',        label: 'Outras Datas' },
  ];
  activeTab = 'hoje';
  objectValues = (obj: any): any[] => Object.values(obj);
  carregando: boolean = true;
  carregandoFuturas: boolean = false; // Novo estado para carregamento da pesquisa
  user: User | null = null;
  
  // Variáveis para controle de período
  dataInicio: string = '';
  dataFim: string = '';
  modalAberto: boolean = false;
  apartamentoSelecionado: any = null;

  constructor(
    private reservasService: ReservasAirbnbService,
    private authService: AuthenticationService,
    private limpezaExtraService: LimpezaExtraService,
    private apartamentosService: ApartamentoService,
    private toastr: ToastrService,
    private route: ActivatedRoute, // <-- injeta o ActivatedRoute
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    
    // Inicializar datas padrão (próximos 30 dias)
    const hoje = new Date();
    const futuro = new Date();
    futuro.setDate(hoje.getDate() + 30);
    
    this.dataInicio = this.formatarDataParaInput(new Date());
    this.dataFim = this.formatarDataParaInput(futuro);

    this.carregarDados();

  }


  private carregarDados(): void {
    this.carregando = true;

    const hoje = new Date();
    const hojeStr = this.formatarDataParaInput(hoje);
    
    // Chamadas para faxinas de hoje
    forkJoin({
      hoje: this.reservasService.getFaxinasPorPeriodo(hojeStr, hojeStr),
      hojeExtra: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(hojeStr, hojeStr),
    }).subscribe({
      next: ({ hoje, hojeExtra }) => {
        const normExtra = (extras: LimpezaExtra[]) =>
          extras.map(e => ({
            id:             e.id,
            apartamento_nome: e.apartamento_nome,
            apartamento_senha: e.apartamento_senha,
            end_data:       e.end_data,
            check_out:      '11:00',
            description:    'LIMPEZA',
            faxina_userId:  e.faxina_userId,
            limpeza_realizada: e.limpeza_realizada,
            apartamento_id:e.apartamento_id,
            Observacoes:e.Observacoes
          }));
          
        this.faxinasHoje = this.ordenarCanceladasPorUltimo([ ...hoje, ...normExtra(hojeExtra) ]);
        this.faxinasHoje = this.faxinasHoje.filter(r => r.faxina_userId === this.user!.id);
        this.faxinasHoje = this.formatDates(this.faxinasHoje);
        this.carregando = false;
      },
      error: err => {
        console.error('Erro ao carregar faxinas:', err);
        this.carregando = false;
      }
    });
  }

  pesquisarPeriodo(): void {
    if (!this.dataInicio || !this.dataFim) {
      this.toastr.warning('Selecione ambas as datas');
      return;
    }
    
    this.carregandoFuturas = true;
    
    forkJoin({
      reservas: this.reservasService.getFaxinasPorPeriodo(this.dataInicio, this.dataFim),
      extras: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(this.dataInicio, this.dataFim),
    }).subscribe({
      next: ({ reservas, extras }) => {
        const normExtra = (extras: LimpezaExtra[]) =>
          extras.map(e => ({
            id: e.id,
            apartamento_nome: e.apartamento_nome,
            apartamento_senha: e.apartamento_senha,
            end_data: e.end_data,
            check_out: '11:00',
            description: 'LIMPEZA',
            faxina_userId: e.faxina_userId,
            limpeza_realizada: e.limpeza_realizada,
            apartamento_id: e.apartamento_id,
            Observacoes: e.Observacoes
          }));

        this.faxinasFuturas = this.ordenarCanceladasPorUltimo([...reservas, ...normExtra(extras)]);
        this.faxinasFuturas = this.faxinasFuturas.filter(r => r.faxina_userId === this.user!.id);
        this.faxinasFuturas = this.formatDates(this.faxinasFuturas);
        this.carregandoFuturas = false;
      },
      error: err => {
        console.error('Erro ao pesquisar período:', err);
        this.toastr.error('Erro ao carregar faxinas');
        this.carregandoFuturas = false;
      }
    });
  }

  // Função para formatar data no formato YYYY-MM-DD (para input type="date")
  private formatarDataParaInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  updateReserva(reserva: any): void {
    if(reserva.description == "LIMPEZA"){
      reserva.faxina_userId = reserva.faxina_userId || null;
      reserva.end_data = this.formatarDataBanco(reserva.end_data);
      this.limpezaExtraService.updateLimpezaExtra(reserva).subscribe(
        data => {
          if(reserva.limpeza_realizada){
            this.toastr.success("Limpeza Registrada!");
          }else{
            this.toastr.info("Finalização Removida!");
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
          if(reserva.limpeza_realizada){
            this.toastr.success("Limpeza Registrada!");
          }else{
            this.toastr.info("Finalização Removida!");
          }
        },
        error => {
          console.error('Erro ao atualizar reserva', error);
        }
      );
    }
  }

  formatarData(dataString: string): string {
    const partes = dataString.split('-');
    if (partes.length !== 3) {
      return dataString;
    }
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }

  formatarDataBanco(dataString: string): string {
    const partes = dataString.split('/');
    if (partes.length !== 3) {
      return dataString;
    }
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  }



  selectTab(id: string): void {
    this.activeTab = id;
  }

  updateStatus(reserva: any, field: string, event: Event, type: string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;
    this.updateReserva(reserva);
  }



  formatarCheckInMesmoDia(faxina: any | undefined): string {
    if(faxina.description == "LIMPEZA"){
      return "Limpeza Manual";
    }else if(faxina.check_in_mesmo_dia){
      return "Entram Hoje";
    }else{
      return "Não Entram Hoje";
    }
  }
  
  getDiaDaSemana(dataStr: string): string {
    const partes = dataStr.split('/');
    if (partes.length !== 3) {
      throw new Error(`Formato de data inválido: ${dataStr}`);
    }

    const dia   = parseInt(partes[0], 10);
    const mes   = parseInt(partes[1], 10) - 1;
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




  private ordenarCanceladasPorUltimo(lista: any[]): any[] {
    return lista.sort((a, b) => {
      const aCancelada = a.description === 'CANCELADA';
      const bCancelada = b.description === 'CANCELADA';
      return Number(aCancelada) - Number(bCancelada);
    });
  }

  private formatDates(lista: any[]): any[] {
    lista.forEach(f => {
      const data = new Date(f.end_data); 
      f.end_data = data.toLocaleDateString('pt-BR');
      if(f.start_date) {
        const data2 = new Date(f.start_date); 
        f.start_date = data2.toLocaleDateString('pt-BR');
      }
    });
    return lista;
  } 
  // Adicione estes métodos à classe
  abrirModal(faxina: any): void {
    this.apartamentoSelecionado = faxina;
    this.apartamentosService.getApartamentoById(faxina.apartamento_id).subscribe( apt => {
      if(apt.endereco){
        this.apartamentoSelecionado.endereco = apt.endereco + ", " + apt.bairro ;

      }else{
         this.apartamentoSelecionado.endereco =  "Sem endereço cadastrado.";
      }
      this.modalAberto = true;
    });
    
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.apartamentoSelecionado = null;
  }

  abrirGoogleMaps(endereco: string): void {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  }
}