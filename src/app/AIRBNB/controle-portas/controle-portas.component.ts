import { Component } from '@angular/core';
import { LigarNodeMcuPredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ligarNodeMcuPredio_service';
import { NodemcuAberturasService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/nodemcu_aberturas_service';
import { NodemcuPrediosService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/nodemcu_predios_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { NodemcuAbertura } from 'src/app/shared/utilitarios/nodemcuAbertura';
import { NodemcuPredio } from 'src/app/shared/utilitarios/nodemcuPredio';
import { Predio } from 'src/app/shared/utilitarios/predio';

@Component({
  selector: 'app-controle-portas',
  templateUrl: './controle-portas.component.html',
  styleUrls: ['./controle-portas.component.css']
})
export class ControlePortasComponent {
  predios: Predio[] = [];
  predioSelecionado: number | null = null;
  dispositivos: NodemcuPredio[] = [];
  acessos: NodemcuAbertura[] = [];
  dataInicio: string = '';
  dataFim: string = '';

  constructor(
    private predioService: PredioService,
    private nodemcuPrediosService: NodemcuPrediosService,
    private ligarNodeMcuService: LigarNodeMcuPredioService,
    private nodemcuAberturasService: NodemcuAberturasService
  ) {
    // Inicializa datas: primeiro dia do mês até hoje
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    this.dataInicio = primeiroDia.toISOString().slice(0, 10);
    this.dataFim = hoje.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.carregarPredios();
  }

  carregarPredios(): void {
    this.predioService.getAllPredios().subscribe({
      next: (predios) => this.predios = predios,
      error: (error) => console.error('Erro ao carregar prédios:', error)
    });
  }

  onPredioSelecionado(): void {
    if (this.predioSelecionado) {
      this.carregarDispositivos();
      this.carregarAcessos();
    } else {
      this.dispositivos = [];
      this.acessos = [];
    }
  }

  carregarDispositivos(): void {
    if(this.predioSelecionado === null) {
      return;
    }
    this.nodemcuPrediosService.getNodemcuPrediosByPredioId(this.predioSelecionado).subscribe({
      next: (dispositivos) => {
        this.dispositivos = dispositivos;
      },
      error: (error) => console.error('Erro ao carregar dispositivos:', error)
    });
  }

  carregarAcessos(): void {
    if(this.predioSelecionado === null) {
      return;
    }
    const startDate = this.dataInicio ? this.dataInicio : undefined;
    const endDate = this.dataFim ? this.dataFim : undefined;
    this.nodemcuAberturasService.getAberturasByPredioId(this.predioSelecionado, startDate, endDate).subscribe({
      next: (acessos) => {
        // Corrige o fuso horário diminuindo 3 horas de cada data
        this.acessos = acessos.map(a => ({
          ...a,
          created_at: a.created_at ? this.ajustarFusoHorario(a.created_at) : a.created_at
        }));
      },
      error: (error) => console.error('Erro ao carregar acessos:', error)
    });
  }

  ajustarFusoHorario(data: string): string {
    // data pode ser string ISO ou string SQL, sempre UTC
    const d = new Date(data);
    d.setHours(d.getHours() - 3);
    return d.toISOString();
  }

  liberarPortao(dispositivo: NodemcuPredio): void {
    const cod_reserva = 'LIBERACAO_MANUAL'; // Código padrão para liberação manual
    this.ligarNodeMcuService.ligarNodeMcu(dispositivo.idNodemcu, cod_reserva).subscribe({
      next: () => {
        this.carregarAcessos(); // Atualiza acessos após liberar
      },
      error: (error) => console.error('Erro ao liberar portão:', error)
    });
  }
}
