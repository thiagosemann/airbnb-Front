import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
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
  reservas: ReservaAirbnb[] = [];
  selectedMonth: string = '';
  monthOptions: any[] = [];
  pagamentos: any[] = [];
  totalMes: number = 0;
  totalFaxinas: number = 0;
  valorPorFaxina: number = 50; // Altere conforme necessário

  constructor(
    private userService: UserService,
    private reservasService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService
  ) {}

  ngOnInit(): void {
    this.getApartamentos();
    this.getUsersByRole();
    this.generateMonthOptions();

    this.activeTab = 'prioridades';
  }

  generateMonthOptions() {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 24; i++) {
      const month = date.getMonth();
      const year = date.getFullYear();
      months.push({
        label: `${date.toLocaleString('default', { month: 'long' })}/${year}`,
        value: `${year}-${(month + 2).toString().padStart(2, '0')}`
      });
      date.setMonth(date.getMonth() - 1);
    }
    this.monthOptions = months.reverse();
  }

  async loadPayments() {
    if (!this.selectedMonth) return;

    try {
      const [startDate, endDate] = this.getMonthDateRange();
      
      // Supondo que você tenha um serviço para buscar as reservas
      const reservas = await this.reservasService.getReservasPorPeriodo(startDate, endDate).toPromise();
      const filtered = reservas!.filter(r => 
        r.limpeza_realizada && 
        r.faxina_userId &&
        new Date(r.end_data).getMonth() === new Date(this.selectedMonth).getMonth()
      );

      // Agrupar por terceirizado
      const pagamentosMap = new Map<number, any>();
      
      filtered.forEach(reserva => {
        const userId = reserva.faxina_userId;
        if (!pagamentosMap.has(userId!)) {
          pagamentosMap.set(userId!, {
            user: this.users.find(u => u.id === userId),
            totalFaxinas: 0,
            valorTotal: 0
          });
        }
        const entry = pagamentosMap.get(userId!);
        entry.totalFaxinas++;
        entry.valorTotal += reserva.valor_limpeza ? Number(reserva.valor_limpeza) : 0;
      });

      this.pagamentos = Array.from(pagamentosMap.values());
      this.calcularTotais();
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }

  // Modifique a função getMonthDateRange
  getMonthDateRange(): [string, string] {
    const date = new Date(this.selectedMonth);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    // Formatar para YYYY-MM-DD
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return [formatDate(start), formatDate(end)];
  }
  calcularTotais() {
    this.totalFaxinas = this.pagamentos.reduce((sum, p) => sum + p.totalFaxinas, 0);
    this.totalMes = this.pagamentos.reduce((sum, p) => sum + p.valorTotal, 0);
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
  


  // Atualize a função getUsersByRole para garantir os valores numéricos
  getUsersByRole(): void {
    this.userService.getUsersByRole('tercerizado').subscribe(
      users => {
        this.users = users.map(user => ({
          ...user,
          domingo: user.domingo || 0,
          segunda: user.segunda || 0,
          terca: user.terca || 0,
          quarta: user.quarta || 0,
          quinta: user.quinta || 0,
          sexta: user.sexta || 0,
          sabado: user.sabado || 0
        }));
      },
      error => {
        console.error('Erro ao obter usuários:', error);
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

  updateLimpezas(user: User): void {
    // Garante que os valores numéricos
    const cleanUser = {
      ...user,
      domingo: Number(user.domingo) || 0,
      segunda: Number(user.segunda) || 0,
      terca: Number(user.terca) || 0,
      quarta: Number(user.quarta) || 0,
      quinta: Number(user.quinta) || 0,
      sexta: Number(user.sexta) || 0,
      sabado: Number(user.sabado) || 0
    };

    this.userService.updateUser(cleanUser).subscribe({
      next: () => {
        console.log('Limpezas atualizadas com sucesso');
      },
      error: (error) => {
        console.error('Erro ao atualizar limpezas:', error);
        // Reverte para valores anteriores em caso de erro
        this.getUsersByRole();
      }
    });
  }
  downloadXls(pagamento: any): void {
    const [startDate, endDate] = this.getMonthDateRange();
    this.reservasService.getReservasPorPeriodo(startDate, endDate).subscribe(reservas => {
      // Filtra as reservas para o terceirizado selecionado
      const filteredReservas = reservas.filter(r => r.faxina_userId === pagamento.user.id);
      
      if (filteredReservas.length === 0) {
        alert('Nenhuma reserva encontrada para este terceirizado no período selecionado.');
        return;
      }
      
      // Monta os dados que serão exportados com a data formatada
      const worksheetData = filteredReservas.map(r => ({
        'ID Reserva': r.id,
        'Apartamento': r.apartamento_nome, // Certifique-se de que essa propriedade exista ou ajuste conforme necessário
        'Data Fim': new Date(r.end_data).toLocaleDateString('pt-BR'),
        'Limpeza Realizada': r.limpeza_realizada ? 'Sim' : 'Não',
        'Valor': r.valor_limpeza
      }));
      
      // Cria a worksheet e o workbook
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');
      
      // Gera e inicia o download do arquivo XLSX
      XLSX.writeFile(workbook, `reservas_${pagamento.user.first_name}.xlsx`);
    });
  }
  
}