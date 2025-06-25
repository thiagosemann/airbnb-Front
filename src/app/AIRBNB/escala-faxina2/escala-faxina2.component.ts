import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { LimpezaExtra } from 'src/app/shared/utilitarios/limpezaextra';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-escala-faxina2',
  templateUrl: './escala-faxina2.component.html',
  styleUrls: ['./escala-faxina2.component.css','./escala-faxina2CssExtra.component.css']
})
export class EscalaFaxina2Component {
  faxinasHoje: any[] = [];
  dataInicio: string = ''; // Nova propriedade
  dataFim: string = '';    // Nova propriedade
  showModal:boolean = false;
   limpezaExtra: LimpezaExtra = {
    apartamento_id: 0,
    end_data: ''
    // os demais campos opcionais já estarão undefined por padrão
  };
  apartamentos: { id: number; nome: string }[] = [];
  carregando: boolean = true;
  users:User[]=[]
  user: User | null = null; // Adicionado para armazenar o usuário atual
  filtro = {
  data: '',
  dia: '',
  apt: '',
  checkout: '',
  senha: '',
  responsavel: ''
};

faxinasFiltradas: any[] = [];

  constructor(private reservasService: ReservasAirbnbService,
              private userService: UserService,
              private authService: AuthenticationService,
              private limpezaExtraService: LimpezaExtraService,
              private apartamentosService: ApartamentoService,
              private toastr: ToastrService
            ) { 
              const hoje = new Date();
              const umaSemanaAtras = new Date();
              umaSemanaAtras.setDate(hoje.getDate() - 7);
              
              this.dataFim = this.formatarDataParaInput(hoje);
              this.dataInicio = this.formatarDataParaInput(umaSemanaAtras);

            }

  ngOnInit(): void {
    this.user = this.authService.getUser(); // Obter o usuário atual
    this.pesquisarPorPeriodo();
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
  pesquisarPorPeriodo(): void {
    if (!this.dataInicio || !this.dataFim) {
      this.toastr.warning('Selecione ambas as datas para pesquisar');
      return;
    }
    this.carregando = true;
    forkJoin({
      reservas: this.reservasService.getFaxinasPorPeriodo(this.dataInicio, this.dataFim),
      limpezas: this.limpezaExtraService.getLimpezasExtrasPorPeriodo(this.dataInicio, this.dataFim)
    }).subscribe({
      next: ({ reservas, limpezas }) => {
        console.log(reservas)
        console.log(limpezas)
        this.processarFaxinas(reservas, limpezas);
        this.faxinasFiltradas = [...this.faxinasHoje];

        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao buscar faxinas por período', err);
        this.toastr.error('Erro ao buscar dados');
        this.carregando = false;
      }
    });
  }

  private processarFaxinas(reservas: ReservaAirbnb[], limpezas: LimpezaExtra[]): void {
    const normExtra = limpezas.map(e => ({
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

    let todasFaxinas = [...reservas, ...normExtra];
    todasFaxinas = this.ordenarCanceladasPorUltimo(todasFaxinas);
    todasFaxinas = this.formatDates(todasFaxinas);
    // Atualizar lista principal
    this.faxinasHoje = todasFaxinas;
  }

filtrarFaxinas(event: Event) {
  const termo = (event.target as HTMLInputElement).value.toLowerCase().trim();
  if (!termo) {
    this.faxinasFiltradas = [...this.faxinasHoje];
  } else {
    this.faxinasFiltradas = this.faxinasHoje.filter(faxina =>
      faxina.end_data?.toLowerCase().includes(termo) ||
      this.getDiaDaSemana(faxina.end_data)?.toLowerCase().includes(termo) ||
      faxina.apartamento_nome?.toLowerCase().includes(termo) ||
      this.getResponsavelNome(faxina.faxina_userId)?.toLowerCase().includes(termo)
    );
  }
}

getResponsavelNome(userId: number): string {
  const user = this.users.find(u => u.id === userId);
  return user ? user.first_name : '';
}

  private formatarDataParaInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
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


  updateStatus(reserva: any, field: string, event: Event, type: string) {
    const checked = (event.target as HTMLInputElement).checked;
    reserva[field] = checked;
    this.updateReserva(reserva)

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
    this.limpezaExtra.end_data = this.formatarDataBanco(this.limpezaExtra.end_data);

    this.limpezaExtraService.createLimpezaExtra(this.limpezaExtra)
      .subscribe({
        next: result => {
          this.limpezaExtra.id = result.insertId;
          this.pesquisarPorPeriodo();
          this.fecharModal();
          this.limpezaExtra = {
            apartamento_id: 0,
            end_data: ''
          };
          this.toastr.success("Nova limpeza cadastrada");
        },
        error: err => {
          console.error('Erro ao criar limpeza extra', err);
          this.toastr.error("Erro ao salvar limpeza");
        }
      });
  }

}
