import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { UserService } from 'src/app/shared/service/Banco_de_Dados/user_service';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { Predio } from 'src/app/shared/utilitarios/predio';
import { User } from 'src/app/shared/utilitarios/user';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';

@Component({
  selector: 'app-cadastro-apartamentos',
  templateUrl: './cadastro-apartamentos.component.html',
  styleUrls: ['./cadastro-apartamentos.component.css']
})
export class CadastroApartamentosComponent implements OnInit {
  apartamentos: Apartamento[] = [];
  apartamentosFiltrados: Apartamento[] = [];
  predios: Predio[] = [];

  showModal = false;
  isEditing = false;
  currentUserId: number | undefined;
  apartamentoSelecionado: Apartamento | undefined;
  form: FormGroup;
  // Novas propriedades para validação iCal
  validatingIcal: { [key: string]: boolean } = {
    airbnb: false,
    booking: false,
    stays: false,
    ayrton: false
  };
  
  icalValid: { [key: string]: boolean | null } = {
    airbnb: null,
    booking: null,
    stays: null,
    ayrton: null
  };

  // Reservas do apartamento em edição
  reservasDoApartamento: ReservaAirbnb[] = [];
  reservasLoading: boolean = false;
  reservasAgrupadasPorMes: Array<{ key: string; label: string; count: number; reservas: ReservaAirbnb[]; open: boolean }>= [];

  // Definição das comodidades do prédio
  amenidadesPredio = [
    { key: 'piscina', label: 'Piscina' },
    { key: 'academia', label: 'Academia' },
    { key: 'churrasqueira', label: 'Churrasqueira' },
    { key: 'salao_de_festas', label: 'Salão de Festas' },
    { key: 'espaco_gourmet', label: 'Espaço Gourmet' },
    { key: 'sauna', label: 'Sauna' },
    { key: 'spa', label: 'Spa' },
    { key: 'salao_de_jogos', label: 'Salão de Jogos' },
    { key: 'coworking', label: 'Coworking' },
    { key: 'jardim_terraco', label: 'Jardim/Terraço' },
    { key: 'lavanderia', label: 'Lavanderia' },
    { key: 'bicicletario', label: 'Bicicletário' },
    { key: 'estacionamento_visitas', label: 'Estac. Visitas' },
    { key: 'elevador_social', label: 'Elevador Social' },
  ];

  selectedPredio: Predio | null = null;

  constructor(
    private fb: FormBuilder,
    private apartamentoService: ApartamentoService,
    private predioService: PredioService,
    private authService: AuthenticationService,
    private userService: UserService,
    private toastr: ToastrService,
    private reservasAirbnbService: ReservasAirbnbService
  ) {
    // Recupera ID do usuário atual (para auditoria)
    const user: User | null = this.authService.getUser();
    this.currentUserId = user ? user.id : undefined;

    // Cria form principal
    this.form = this.fb.group({
      id: [''],
      nome: [''],
      predio_id: [''],
      nome_anuncio: [''],
      link_airbnb_calendario: [''],
      link_booking_calendario: [''],
      link_stays_calendario: [''],
      link_ayrton_calendario: [''],
      link_fotos: [''],
      endereco: [''],
      bairro: [''],
      andar: [''],
      vaga_garagem: [0],
      senha_porta: [''],
      ssid_wifi: [''],
      senha_wifi: [''],
      numero_hospedes: [1],
      porcentagem_cobrada: [0],
      valor_enxoval: [0],
      valor_limpeza: [0],
      aceita_pet: [false],
      totem: [false],
      adesivo_aviso: [false],
      pedir_selfie: [false],
      tem_garagem: [false],
      qtd_cama_solteiro: [0],
      qtd_cama_casal: [0],
      qtd_sofa_cama: [0],
      qtd_banheiros: [0],
      qtd_taca_vinho: [0],
      tipo_checkin: ['self-checkin'],
      acesso_predio: [''],
      acesso_porta: [''],
      link_app: [''],
      tipo_fogao: [''],
      tipo_chuveiro: [''],
      // --- Enxoval fields added ---
      enxoval_sobre_lencol_casal: [0],
      enxoval_fronha: [0],
      enxoval_sobre_lencol_solteiro: [0],
      enxoval_toalhas: [0],
      enxoval_pisos: [0],
      enxoval_rostos: [0],
      // -----------------------------
      secador_cabelo: [false],
      cafeteira: [false],
      ventilador: [false],
      ferro_passar: [false],
      sanduicheira: [false],
      chaleira_eletrica: [false],
      liquidificador: [false],
      smart_tv: [false],
      tv_aberta: [false],
      escritorio: [false],
      ar_condicionado: [false],
      aspirador_de_po: [false],
      aquecedor: [false],
      itens_limpeza: [''],
      air_fryer: [false],
      link_anuncio_airbnb: [''],
      link_anuncio_booking: [''],
      modificado_user_id: [0],
      data_ultima_modificacao: [''],
      cod_link_proprietario: [''],
      categoria: [''],
      tipo_anuncio_repasse: ['']
    });

    // Adiciona sub-FormGroup para as amenidades do prédio
    this.form.addControl(
      'predioAmenities',
      this.fb.group(
        this.amenidadesPredio.reduce((acc, a) => {
          acc[a.key] = [false];
          return acc;
        }, {} as any)
      )
    );
  }

  ngOnInit(): void {
    // Carrega prédios primeiro
    this.predioService.getAllPredios().subscribe({
      next: preds => {
        this.predios = preds;
        this.setupPredioListener();
        this.carregarApartamentos();
      },
      error: err => console.error('Erro ao carregar prédios:', err)
    });

    // Nova lógica de habilitação dos campos de calendário
    const updateCalendarFields = () => {
      const airbnb = this.form.get('link_airbnb_calendario')?.value?.trim();
      const booking = this.form.get('link_booking_calendario')?.value?.trim();
      const stays = this.form.get('link_stays_calendario')?.value?.trim();
      const ayrton = this.form.get('link_ayrton_calendario')?.value?.trim();

      if (stays) {
        this.form.get('link_stays_calendario')?.enable({ emitEvent: false });
        this.form.get('link_airbnb_calendario')?.disable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.disable({ emitEvent: false });
        this.form.get('link_ayrton_calendario')?.disable({ emitEvent: false });
      } else if (ayrton) {
        this.form.get('link_ayrton_calendario')?.enable({ emitEvent: false });
        this.form.get('link_airbnb_calendario')?.disable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.disable({ emitEvent: false });
        this.form.get('link_stays_calendario')?.disable({ emitEvent: false });
      } else if (airbnb || booking) {
        this.form.get('link_airbnb_calendario')?.enable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.enable({ emitEvent: false });
        this.form.get('link_stays_calendario')?.disable({ emitEvent: false });
        this.form.get('link_ayrton_calendario')?.disable({ emitEvent: false });
      } else {
        this.form.get('link_airbnb_calendario')?.enable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.enable({ emitEvent: false });
        this.form.get('link_stays_calendario')?.enable({ emitEvent: false });
        this.form.get('link_ayrton_calendario')?.enable({ emitEvent: false });
      }
    };
    this.form.get('link_stays_calendario')?.valueChanges.subscribe(updateCalendarFields);
    this.form.get('link_ayrton_calendario')?.valueChanges.subscribe(updateCalendarFields);
    this.form.get('link_airbnb_calendario')?.valueChanges.subscribe(updateCalendarFields);
    this.form.get('link_booking_calendario')?.valueChanges.subscribe(updateCalendarFields);
    updateCalendarFields();
    this.setupIcalValidation();

  }
  private setupIcalValidation(): void {
      const icalFields = {
        'link_airbnb_calendario': 'airbnb',
        'link_booking_calendario': 'booking',
        'link_stays_calendario': 'stays',
        'link_ayrton_calendario': 'ayrton'
      };

      Object.entries(icalFields).forEach(([fieldName, icalKey]) => {
        this.form.get(fieldName)?.valueChanges
          .pipe(
            debounceTime(1000),
            distinctUntilChanged()
          )
          .subscribe((value: string) => {
            if (value && value.trim() !== '') {
              this.validateIcal(value, icalKey);
            } else {
              this.icalValid[icalKey] = null;
            }
          });
      });
    }
    validateIcal(icalUrl: string, icalKey: string): void {
    this.validatingIcal[icalKey] = true;
    this.icalValid[icalKey] = null;

    this.apartamentoService.validarIcalBackend(icalUrl).subscribe({
      next: (response) => {
        this.validatingIcal[icalKey] = false;
        this.icalValid[icalKey] = response.valido;
        if (!response.valido) {
          this.toastr.warning(`Link do ${icalKey} parece ser inválido: ${response.message || ''}`);
        } else if (response.valido && response.possuiEventos === false) {
          this.toastr.info(`Link do ${icalKey} é válido, mas não possui eventos.`);
        }
      },
      error: (err) => {
        this.validatingIcal[icalKey] = false;
        this.icalValid[icalKey] = false;
        this.toastr.error(`Erro ao validar link do ${icalKey}`);
        console.error('Erro na validação iCal:', err);
      }
    });
  }
  /** Configura listener para quando o usuário escolher um prédio no form */
  private setupPredioListener(): void {
    this.form.get('predio_id')!.valueChanges.subscribe((pid: number) => {
      const p = this.predios.find(x => x.id === +pid) || null;
      this.selectedPredio = p;
      // Atualiza checkboxes do grupo predioAmenities
      if (p) {
        const vals = this.amenidadesPredio.reduce((o, a) => ({
          ...o,
          [a.key]: !!(p as any)[a.key]
        }), {});
        (this.form.get('predioAmenities') as FormGroup).patchValue(vals);
      }
    });
  }

  /** Carrega apartamentos e pré-processa nomes de usuário */
  private carregarApartamentos(): void {
    this.apartamentoService.getAllApartamentos().subscribe({
      next: data => {
        this.apartamentos = data.sort((a, b) => a.nome.localeCompare(b.nome));
        this.apartamentosFiltrados = [...this.apartamentos];
      },
      error: err => console.error('Erro ao carregar apartamentos:', err)
    });
  }

  filtrarApartamentos(event: Event): void {
    const termo = (event.target as HTMLInputElement).value.toLowerCase().trim();
    if (!termo) {
      this.apartamentosFiltrados = [...this.apartamentos];
    } else {
      this.apartamentosFiltrados = this.apartamentos.filter(apt =>
        apt.nome.toLowerCase().includes(termo) ||
        this.getNomePredio(apt.predio_id).toLowerCase().includes(termo)
      );
    }
  }

  abrirModal(): void {
    this.showModal = true;
    this.isEditing = false;
    this.reservasDoApartamento = [];
    this.reservasAgrupadasPorMes = [];
    this.reservasLoading = false;
    this.form.reset({
      numero_hospedes: 1,
      porcentagem_cobrada: 0,
      valor_enxoval: 0,
      valor_limpeza: 0,
      qtd_banheiros: 0,
      // Ensure enxoval fields reset to 0
      enxoval_sobre_lencol_casal: 0,
      enxoval_fronha: 0,
      enxoval_sobre_lencol_solteiro: 0,
      enxoval_toalhas: 0,
      enxoval_pisos: 0,
      enxoval_rostos: 0,
      pedir_selfie: false,
      tem_garagem: false,
      modificado_user_id: this.currentUserId
    });
  }

  editarApartamento(apt: any): void {
    this.isEditing = true;
    this.showModal = true;
    this.form.patchValue(apt);
    this.apartamentoSelecionado = apt;

    // Carregar reservas do apartamento
    this.reservasDoApartamento = [];
    this.reservasAgrupadasPorMes = [];
    if (apt && apt.id) {
      this.reservasLoading = true;
      this.reservasAirbnbService.getReservasByApartamentoId(apt.id).subscribe({
        next: (reservas) => {
          // Ordena por data de início DESC (mais recente primeiro)
          this.reservasDoApartamento = (reservas || []).sort((a, b) => {
            const da = this.parseYMDToTime(String(a.start_date));
            const db = this.parseYMDToTime(String(b.start_date));
            return db - da;
          });
          this.buildReservasAgrupadas();
          this.reservasLoading = false;
        },
        error: (err) => {
          console.error('Erro ao carregar reservas do apartamento:', err);
          this.toastr.error('Erro ao carregar reservas do apartamento');
          this.reservasLoading = false;
        }
      });
    }
  }

  private buildReservasAgrupadas(): void {
    const map = new Map<string, ReservaAirbnb[]>(); // key: yyyy-mm
    for (const r of this.reservasDoApartamento) {
      const key = this.yearMonthKey(String(r.start_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // Já está em ordem DESC por start_date, manter ordem dos grupos por key desc
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    this.reservasAgrupadasPorMes = keys.map(key => {
      const reservas = map.get(key)!;
      return {
        key,
        label: this.formatarMesAnoLabel(key),
        count: reservas.length,
        reservas,
        open: false
      };
    });
  }

  private yearMonthKey(isoLike: string): string {
    // Espera 'YYYY-MM-DD' ou ISO. Extrai localmente sem timezone.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoLike);
    if (m) return `${m[1]}-${m[2]}`;
    const d = new Date(isoLike);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  private parseYMDToTime(isoLike: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoLike);
    if (m) {
      const y = +m[1], mo = +m[2]-1, da = +m[3];
      return new Date(y, mo, da).getTime();
    }
    const d = new Date(isoLike);
    return d.getTime();
  }

  formatarMesAnoLabel(key: string): string {
    // key = 'YYYY-MM'
    const [y, m] = key.split('-').map(n => +n);
    const d = new Date(y, (m||1)-1, 1);
    const mes = d.toLocaleDateString('pt-BR', { month: 'long' });
    const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1);
    return `${mesCap}-${y}`;
  }

  toggleGrupo(index: number): void {
    this.reservasAgrupadasPorMes = this.reservasAgrupadasPorMes.map((g, i) => ({
      ...g,
      open: i === index ? !g.open : false
    }));
  }

  excluirApartamento(id: number): void {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este apartamento?')) return;
    this.apartamentoService.deleteApartamento(id).subscribe({
      next: () => {
        this.toastr.success('Apartamento excluído com sucesso!');
        this.carregarApartamentos();
      },
      error: () => this.toastr.error('Erro ao excluir apartamento')
    });
  }

  onSubmit(): void {
    // Verificar se há pelo menos 1 link de calendário preenchido
    const links = [
      this.form.get('link_airbnb_calendario')?.value,
      this.form.get('link_booking_calendario')?.value,
      this.form.get('link_stays_calendario')?.value,
      this.form.get('link_ayrton_calendario')?.value
    ];
    const algumLinkPreenchido = links.some(link => link && link.trim() !== '');
    if (!algumLinkPreenchido) {
      this.toastr.error('Informe pelo menos um link de calendário (Airbnb, Booking ou Stays) para cadastrar.');
      return;
    }
    // Verificar se há links iCal inválidos
    const invalidLinks = Object.entries(this.icalValid)
      .filter(([key, valid]) => valid === false)
      .map(([key]) => key);

    if (invalidLinks.length > 0) {
      this.toastr.error(`Por favor, corrija os links inválidos: ${invalidLinks.join(', ')}`);
      return;
    }
    const aptPayload = this.form.value;

    // Atualiza comodidades do prédio antes de salvar apartamento
    const predioId = aptPayload.predio_id;
    const predioValues = aptPayload.predioAmenities;
    const predioUpdate: any = { id: predioId };
    this.amenidadesPredio.forEach(a => {
      predioUpdate[a.key] = predioValues[a.key] ? 1 : 0;
    });
    const predioSelecionado = this.predios.find(predio => predio.id == predioId )
    if(!predioSelecionado){
      return
    }
    predioUpdate.nome = predioSelecionado.nome;
    this.predioService.updatePredio(predioUpdate).subscribe({
      next: () => {
        // Depois de atualizar prédio, salva apartamento
        const request$ = this.isEditing
          ? this.apartamentoService.updateApartamento(aptPayload)
          : this.apartamentoService.createApartamento(aptPayload);

        request$.subscribe({
          next: () => {
            this.toastr.success(`Apartamento ${this.isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            this.fecharModal();
            this.carregarApartamentos();
          },
          error: () => this.toastr.error(`Erro ao ${this.isEditing ? 'atualizar' : 'criar'} apartamento`)
        });
      },
      error: () => this.toastr.error('Erro ao atualizar comodidades do prédio')
    });
  }

  fecharModal(): void {
    this.showModal = false;
    this.isEditing = false;
  }

  getNomePredio(predioId: number): string {
    const p = this.predios.find(x => x.id === predioId);
    return p ? p.nome : 'Não encontrado';
  }

  copiarGaragem() {
  if (this.apartamentoSelecionado &&  this.apartamentoSelecionado.vaga_garagem) {
    this.form.get('vaga_garagem')?.setValue(this.apartamentoSelecionado.vaga_garagem);
    this.toastr.success('Informações da garagem copiadas com sucesso!');
  }
}

  formatarData(dataString: string): string {
    if (!dataString) return '-';
    const d = new Date(dataString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
    // Fallback para formato YYYY-MM-DD
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(String(dataString));
    if (m) {
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
    return String(dataString);
  }
}
