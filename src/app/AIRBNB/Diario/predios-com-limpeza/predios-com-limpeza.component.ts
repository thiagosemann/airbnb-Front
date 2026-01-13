import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';

import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { Predio } from 'src/app/shared/utilitarios/predio';
import { User } from 'src/app/shared/utilitarios/user';

@Component({
  selector: 'app-predios-com-limpeza',
  templateUrl: './predios-com-limpeza.component.html',
  styleUrls: ['./predios-com-limpeza.component.css']
})
export class PrediosComLimpezaComponent implements OnInit, OnChanges {
  @Input() dataInicio: string | undefined;
  @Input() dataFim: string | undefined;

  carregandoFaxinas: boolean = false;
  showPredios: boolean = false;
  predioSearchTerm: string = '';

  faxinasPorPeriodo: ReservaAirbnb[] = [];
  faxinasPorPredio: {
    predioId: number;
    predioNome: string;
    faxineiros: number[];
    faxineirosNomes: string[];
    enxovalSobreLencolCasal: number;
    enxovalFronha: number;
    enxovalSobreLencolSolteiro: number;
    enxovalToalhas: number;
    enxovalPisos: number;
    enxovalRostos: number;
  }[] = [];

  apartamentosCache: Apartamento[] = [];
  prediosCache: Predio[] = [];
  apartamentosMap: Map<number, Apartamento> = new Map();
  prediosMap: Map<number, string> = new Map();
  faxinasCarregadas: boolean = false;
  users: User[] = [];

  constructor(
    private reservasAirbnbService: ReservasAirbnbService,
    private apartamentoService: ApartamentoService,
    private predioService: PredioService,
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.getUsersByRole();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInicio'] || changes['dataFim']) {
      this.faxinasCarregadas = false;
      if (this.showPredios) {
        this.carregarFaxinasPorPeriodo();
      }
    }
  }

  togglePredios(): void {
    this.showPredios = !this.showPredios;
    if (this.showPredios && !this.faxinasCarregadas && !this.carregandoFaxinas) {
      this.carregarFaxinasPorPeriodo();
    }
  }

  private getUsersByRole(): void {
    this.userService.getUsersByRole('terceirizado').subscribe(
      users => {
        this.users = users;
      },
      error => {
        console.error('Erro ao obter usuários terceirizados', error);
      }
    );
  }

  private carregarFaxinasPorPeriodo(): void {
    if (!this.dataInicio || !this.dataFim) {
      return;
    }

    this.carregandoFaxinas = true;
    const apartamentos$ = this.apartamentosCache.length ? of(this.apartamentosCache) : this.apartamentoService.getAllApartamentos();
    const predios$ = this.prediosCache.length ? of(this.prediosCache) : this.predioService.getAllPredios();

    forkJoin({
      faxinas: this.reservasAirbnbService.getFaxinasPorPeriodo(this.dataInicio, this.dataFim),
      apartamentos: apartamentos$,
      predios: predios$
    }).subscribe({
      next: ({ faxinas, apartamentos, predios }) => {
        if (apartamentos && apartamentos.length) {
          this.apartamentosCache = apartamentos;
          this.apartamentosMap = new Map(apartamentos.map(a => [a.id, a]));
        }

        if (predios && predios.length) {
          this.prediosCache = predios;
          this.prediosMap = new Map(predios.map(p => [p.id, p.nome]));
        }

        this.faxinasPorPeriodo = faxinas.slice().sort((a, b) => {
          const aCancel = a.description === 'CANCELADA' ? 1 : 0;
          const bCancel = b.description === 'CANCELADA' ? 1 : 0;
          if (aCancel !== bCancel) return aCancel - bCancel;

          const ad = new Date(a.end_data).getTime();
          const bd = new Date(b.end_data).getTime();
          return ad - bd;
        });

        this.agruparFaxinasPorPredio();
        this.faxinasCarregadas = true;
        this.carregandoFaxinas = false;
      },
      error: (error) => {
        console.error('Erro ao carregar faxinas:', error);
        this.toastr.error('Erro ao carregar faxinas');
        this.faxinasCarregadas = false;
        this.carregandoFaxinas = false;
      }
    });
  }

  private agruparFaxinasPorPredio(): void {
    const grupo = new Map<number, Set<number>>();

    this.faxinasPorPeriodo.forEach(f => {
      const apt = this.apartamentosMap.get(f.apartamento_id);
      const predioId = apt?.predio_id ?? -1;
      if (!grupo.has(predioId)) {
        grupo.set(predioId, new Set<number>());
      }
      if (f.faxina_userId) {
        grupo.get(predioId)!.add(f.faxina_userId);
      }
    });

    const lista = Array.from(grupo.entries()).map(([predioId, users]) => {
      const ids = Array.from(users).sort((a, b) => a - b);
      const nomes = ids.map(id => this.users.find(u => u.id === id)?.first_name).filter(Boolean) as string[];

      const apartamentosDoPredio = this.apartamentosCache.filter(a => a.predio_id === predioId);
      const enxovalTotais = apartamentosDoPredio.reduce((acc, apt) => {
        acc.enxovalSobreLencolCasal += apt.enxoval_sobre_lencol_casal ?? 0;
        acc.enxovalFronha += apt.enxoval_fronha ?? 0;
        acc.enxovalSobreLencolSolteiro += apt.enxoval_sobre_lencol_solteiro ?? 0;
        acc.enxovalToalhas += apt.enxoval_toalhas ?? 0;
        acc.enxovalPisos += apt.enxoval_pisos ?? 0;
        acc.enxovalRostos += apt.enxoval_rostos ?? 0;
        return acc;
      }, {
        enxovalSobreLencolCasal: 0,
        enxovalFronha: 0,
        enxovalSobreLencolSolteiro: 0,
        enxovalToalhas: 0,
        enxovalPisos: 0,
        enxovalRostos: 0
      });

      return {
        predioId,
        predioNome: this.prediosMap.get(predioId) || 'Sem prédio',
        faxineiros: ids,
        faxineirosNomes: nomes,
        ...enxovalTotais
      };
    });

    this.faxinasPorPredio = lista.sort((a, b) => a.predioNome.localeCompare(b.predioNome));
  }

  get prediosFiltrados(): {
    predioId: number;
    predioNome: string;
    faxineiros: number[];
    faxineirosNomes: string[];
    enxovalSobreLencolCasal: number;
    enxovalFronha: number;
    enxovalSobreLencolSolteiro: number;
    enxovalToalhas: number;
    enxovalPisos: number;
    enxovalRostos: number;
  }[] {
    const term = this.predioSearchTerm.trim().toLowerCase();
    if (!term) return this.faxinasPorPredio;

    return this.faxinasPorPredio.filter(p =>
      p.predioNome.toLowerCase().includes(term)
      || p.faxineirosNomes.some(n => n.toLowerCase().includes(term))
      || p.faxineiros.some(id => id.toString().includes(term))
    );
  }

  get totaisEnxoval(): {
    enxovalSobreLencolCasal: number;
    enxovalFronha: number;
    enxovalSobreLencolSolteiro: number;
    enxovalToalhas: number;
    enxovalPisos: number;
    enxovalRostos: number;
  } {
    return this.prediosFiltrados.reduce((acc, predio) => {
      acc.enxovalSobreLencolCasal += predio.enxovalSobreLencolCasal;
      acc.enxovalFronha += predio.enxovalFronha;
      acc.enxovalSobreLencolSolteiro += predio.enxovalSobreLencolSolteiro;
      acc.enxovalToalhas += predio.enxovalToalhas;
      acc.enxovalPisos += predio.enxovalPisos;
      acc.enxovalRostos += predio.enxovalRostos;
      return acc;
    }, {
      enxovalSobreLencolCasal: 0,
      enxovalFronha: 0,
      enxovalSobreLencolSolteiro: 0,
      enxovalToalhas: 0,
      enxovalPisos: 0,
      enxovalRostos: 0
    });
  }
}
