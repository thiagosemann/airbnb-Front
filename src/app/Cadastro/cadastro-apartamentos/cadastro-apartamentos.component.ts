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
    stays: false
  };
  
  icalValid: { [key: string]: boolean | null } = {
    airbnb: null,
    booking: null,
    stays: null
  };

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
    private toastr: ToastrService
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
      qtd_cama_solteiro: [0],
      qtd_cama_casal: [0],
      qtd_sofa_cama: [0],
      qtd_taca_vinho: [0],
      tipo_checkin: ['self-checkin'],
      acesso_predio: [''],
      acesso_porta: [''],
      link_app: [''],
      tipo_fogao: [''],
      tipo_chuveiro: [''],
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
      categoria: ['']

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

    // Lógica de desabilitar campos de links de calendário
    this.form.get('link_stays_calendario')?.valueChanges.subscribe((stays: string) => {
      if (stays && stays.trim() !== '') {
        this.form.get('link_airbnb_calendario')?.disable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.disable({ emitEvent: false });
      } else {
        this.form.get('link_airbnb_calendario')?.enable({ emitEvent: false });
        this.form.get('link_booking_calendario')?.enable({ emitEvent: false });
      }
    });
    const disableStaysIfOther = () => {
      const airbnb = this.form.get('link_airbnb_calendario')?.value;
      const booking = this.form.get('link_booking_calendario')?.value;
      if ((airbnb && airbnb.trim() !== '') || (booking && booking.trim() !== '')) {
        this.form.get('link_stays_calendario')?.disable({ emitEvent: false });
      } else {
        this.form.get('link_stays_calendario')?.enable({ emitEvent: false });
      }
    };
    this.form.get('link_airbnb_calendario')?.valueChanges.subscribe(disableStaysIfOther);
    this.form.get('link_booking_calendario')?.valueChanges.subscribe(disableStaysIfOther);
    this.setupIcalValidation();

  }
  private setupIcalValidation(): void {
      const icalFields = {
        'link_airbnb_calendario': 'airbnb',
        'link_booking_calendario': 'booking', 
        'link_stays_calendario': 'stays'
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
    this.form.reset({ numero_hospedes: 1, porcentagem_cobrada: 0, valor_enxoval: 0, valor_limpeza: 0, modificado_user_id: this.currentUserId });
  }

  editarApartamento(apt: any): void {
    this.isEditing = true;
    this.showModal = true;
    this.form.patchValue(apt);
    this.apartamentoSelecionado = apt;
  }

  excluirApartamento(id: number): void {
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
      this.form.get('link_stays_calendario')?.value
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
}
