import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { User } from 'src/app/shared/utilitarios/user';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb';
import { LimpezaExtraService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/limpezaextra_service';

@Component({
  selector: 'app-controle-faxina',
  templateUrl: './controle-faxina.component.html',
  styleUrls: ['./controle-faxina.component.css','./controle-faxina.component2.css','./controle-faxina.component3.css']
})
export class ControleFaxinaComponent implements OnInit {
  users: User[] = [];
  selectedMonth: string = '';
  monthOptions: any[] = [];
  pagamentos: any[] = [];
  totalMes: number = 0;
  totalFaxinas: number = 0;
  valorPorFaxina: number = 50;
  maxFaxinas: number = 0;
  
  // Variáveis para detalhamento
  showModal: boolean = false;
  selectedTercerizado: any = null;
  faxinasDetalhadas: any[] = [];

  constructor(
    private userService: UserService,
    private reservasService: ReservasAirbnbService,
    private limpezaExtraService: LimpezaExtraService
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.generateMonthOptions();
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
    this.monthOptions = months;
  }

  getUsers(): void {
    this.userService.getUsersByRole('tercerizado').subscribe(users => {
      this.users = users;
    });
  }

  async loadPayments() {
    if (!this.selectedMonth) return;

    try {
      const [startDate, endDate] = this.getMonthDateRange();
      const reservas = await this.reservasService.getFaxinasPorPeriodo(startDate, endDate).toPromise();
      const limpezasExtras = await this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise();
      
      const pagamentosMap = new Map<number, any>();
      this.maxFaxinas = 0;
      const allServicos = [...(reservas || []), ...(limpezasExtras || [])];
      
      allServicos.forEach(servico => {
        const userId = servico.faxina_userId;
        const data = new Date(servico.end_data);

        if (
          servico.limpeza_realizada &&
          userId &&
          data.getMonth() === new Date(this.selectedMonth).getMonth() &&
          data.getFullYear() === new Date(this.selectedMonth).getFullYear()
        ) {
          if (!pagamentosMap.has(userId)) {
            pagamentosMap.set(userId, {
              user: this.users.find(u => u.id === userId),
              totalFaxinas: 0,
              valorTotal: 0
            });
          }
          
          const entry = pagamentosMap.get(userId);
          entry.totalFaxinas++; 
          entry.valorTotal += servico.valor_limpeza ? Number(servico.valor_limpeza) : 0;
          
          if (entry.totalFaxinas > this.maxFaxinas) {
            this.maxFaxinas = entry.totalFaxinas;
          }
        }
      });

      this.pagamentos = Array.from(pagamentosMap.values());
      this.calcularTotais();
      const totalFaxinasRealizadas = this.totalFaxinas;
      const somaValoresFaxinas = this.totalMes;
      this.valorPorFaxina = totalFaxinasRealizadas > 0 ? (somaValoresFaxinas / totalFaxinasRealizadas) : 0;
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  }

  getMonthDateRange(): [string, string] {
    const date = new Date(this.selectedMonth);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

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

  downloadXls(pagamento: any): void {
    const [startDate, endDate] = this.getMonthDateRange();
    Promise.all([
      this.reservasService.getReservasPorPeriodo(startDate, endDate).toPromise(),
      this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise()
    ]).then(([reservas, extras]) => {
      const allServicos = [...(reservas || []), ...(extras || [])];
      // Agora inclui todas as faxinas, não só as realizadas
      const filteredServicos = allServicos.filter(r => r.faxina_userId === pagamento.user.id);

      if (filteredServicos.length === 0) {
        alert('Nenhuma reserva encontrada para este terceirizado no período selecionado.');
        return;
      }

      const worksheetData = filteredServicos.map(r => ({
        'ID Reserva': r.id,
        'Apartamento': r.apartamento_nome,
        'Data Fim': new Date(r.end_data).toLocaleDateString('pt-BR'),
        'Limpeza Realizada': r.limpeza_realizada ? 'Sim' : 'Não',
        'Valor': r.valor_limpeza ? Number(r.valor_limpeza) : 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');
      XLSX.writeFile(workbook, `reservas_${pagamento.user.first_name}.xlsx`);
    });
  }

  downloadResumoGeralXls(): void {
    const [startDate, endDate] = this.getMonthDateRange();
    Promise.all([
      this.reservasService.getFaxinasPorPeriodo(startDate, endDate).toPromise(),
      this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise()
    ]).then(([reservas, extras]) => {
      const allServicos = [...(reservas || []), ...(extras || [])];
      // Agrupa por terceirizado
      const resumoMap = new Map<number, { nome: string, totalFaxinas: number, valorTotal: number }>();
      this.users.filter(user => user.id !== undefined).forEach(user => {
        resumoMap.set(user.id as number, { nome: user.first_name, totalFaxinas: 0, valorTotal: 0 });
      });
      // Agora soma todas as faxinas, não só as realizadas
      allServicos.forEach(servico => {
        if (servico.faxina_userId) {
          const entry = resumoMap.get(servico.faxina_userId);
          if (entry) {
            entry.totalFaxinas++;
            entry.valorTotal += servico.valor_limpeza ? Number(servico.valor_limpeza) : 0;
          }
        }
      });
      // Monta dados para a aba Resumo
      const resumoData = Array.from(resumoMap.values()).filter(e => e.totalFaxinas > 0);
      const resumoSheet = XLSX.utils.json_to_sheet(resumoData.map(e => ({
        'Terceirizado': e.nome,
        'Total Faxinas': e.totalFaxinas,
        'Valor Total': e.valorTotal
      })));
      // Monta dados detalhados para cada terceirizado
      const detalhadoSheets: { [key: string]: XLSX.WorkSheet } = {};
      this.users.filter(user => user.id !== undefined).forEach(user => {
        // Inclui todas as faxinas, não só as realizadas
        const userServicos = allServicos.filter(s => s.faxina_userId === user.id);
        if (userServicos.length > 0) {
          detalhadoSheets[user.first_name] = XLSX.utils.json_to_sheet(userServicos.map(r => ({
            'ID Reserva': r.id,
            'Apartamento': r.apartamento_nome,
            'Data Fim': new Date(r.end_data).toLocaleDateString('pt-BR'),
            'Limpeza Realizada': r.limpeza_realizada ? 'Sim' : 'Não',
            'Valor': r.valor_limpeza ? Number(r.valor_limpeza) : 0
          })));
        }
      });
      // Cria o workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');
      Object.keys(detalhadoSheets).forEach(nome => {
        XLSX.utils.book_append_sheet(workbook, detalhadoSheets[nome], nome);
      });
      XLSX.writeFile(workbook, `resumo_terceirizadas_${this.selectedMonth}.xlsx`);
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    
    return initials;
  }

  getProgressWidth(count: number): number {
    if (this.maxFaxinas === 0) return 0;
    return (count / this.maxFaxinas) * 100;
  }
  
  // Métodos para o detalhamento
  async openDetails(pagamento: any) {
    this.selectedTercerizado = pagamento;
    
    try {
      const [startDate, endDate] = this.getMonthDateRange();
      const reservas = await this.reservasService.getFaxinasPorPeriodo(startDate, endDate).toPromise();
      const limpezasExtras = await this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise();
      
      const allServicos = [...(reservas || []), ...(limpezasExtras || [])];
      
      this.faxinasDetalhadas = allServicos.filter(servico => {
        const data = new Date(servico.end_data);
        return (
          servico.faxina_userId === pagamento.user.id &&
          servico.limpeza_realizada &&
          data.getMonth() === new Date(this.selectedMonth).getMonth() &&
          data.getFullYear() === new Date(this.selectedMonth).getFullYear()
        );
      });
      
      this.showModal = true;
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    }
  }
  
  closeModal() {
    this.showModal = false;
    this.selectedTercerizado = null;
    this.faxinasDetalhadas = [];
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  }
  
  getAverageFaxinas(): string {
    // Implementar lógica real de cálculo de média histórica
    const avg = this.selectedTercerizado?.totalFaxinas * 0.85;
    return avg ? avg.toFixed(1) : 'N/A';
  }
  
  getAverageValue(): number {
    // Implementar lógica real de cálculo de valor médio
    return this.selectedTercerizado?.valorTotal / this.selectedTercerizado?.totalFaxinas || 0;
  }
  
  getRating(): string {
    // Implementar lógica real de avaliação
    const ratings = [4.2, 4.5, 4.8, 4.0, 4.7];
    return ratings[Math.floor(Math.random() * ratings.length)].toFixed(1);
  }
  // Adicione estas novas funções ao componente TypeScript

  // Função para obter o dia da data
  getDay(dateString: string): string {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.getDate().toString().padStart(2, '0');
  }

  // Função para obter o mês abreviado
  getMonth(dateString: string): string {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { month: 'short' });
  }

  // Função para obter a data da última faxina
  getLastCleaning(): string {
    if (!this.faxinasDetalhadas || this.faxinasDetalhadas.length === 0) {
      return 'N/A';
    }
    
    // Ordenar por data (mais recente primeiro)
    const sortedFaxinas = [...this.faxinasDetalhadas].sort((a, b) => 
      new Date(b.end_data).getTime() - new Date(a.end_data).getTime()
    );
    
    const lastDate = new Date(sortedFaxinas[0].end_data);
    return lastDate.toLocaleDateString('pt-BR');
  }
}