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
  styleUrls: ['./controle-faxina.component.css']
})
export class ControleFaxinaComponent implements OnInit {
  users: User[] = [];
  selectedMonth: string = '';
  monthOptions: any[] = [];
  pagamentos: any[] = [];
  totalMes: number = 0;
  totalFaxinas: number = 0;
  valorPorFaxina: number = 50;

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
    this.monthOptions = months.reverse();
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
    const reservas = await this.reservasService.getReservasPorPeriodo(startDate, endDate).toPromise();
    const limpezasExtras = await this.limpezaExtraService.getLimpezasExtrasPorPeriodo(startDate, endDate).toPromise();
    console.log(limpezasExtras)
    const pagamentosMap = new Map<number, any>();

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
      }
    });

    this.pagamentos = Array.from(pagamentosMap.values());
    this.calcularTotais();
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
    this.reservasService.getReservasPorPeriodo(startDate, endDate).subscribe(reservas => {
      const filteredReservas = reservas.filter(r => r.faxina_userId === pagamento.user.id);

      if (filteredReservas.length === 0) {
        alert('Nenhuma reserva encontrada para este terceirizado no período selecionado.');
        return;
      }

      const worksheetData = filteredReservas.map(r => ({
        'ID Reserva': r.id,
        'Apartamento': r.apartamento_nome,
        'Data Fim': new Date(r.end_data).toLocaleDateString('pt-BR'),
        'Limpeza Realizada': r.limpeza_realizada ? 'Sim' : 'Não',
        'Valor': r.valor_limpeza
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas');
      XLSX.writeFile(workbook, `reservas_${pagamento.user.first_name}.xlsx`);
    });
  }
}
