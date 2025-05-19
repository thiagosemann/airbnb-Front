import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApartamentoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/apartamento_service';
import { PredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/predio_service';
import { VistoriaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/vistoria_service';
import { AuthenticationService } from 'src/app/shared/service/Banco_de_Dados/authentication';
import { Apartamento } from 'src/app/shared/utilitarios/apartamento';
import { Predio } from 'src/app/shared/utilitarios/predio';
import { User } from 'src/app/shared/utilitarios/user';
import { Vistoria } from 'src/app/shared/utilitarios/vistoria';


@Component({
  selector: 'app-vistoria',
  templateUrl: './vistoria.component.html',
  styleUrls: ['./vistoria.component.css']
})
export class VistoriaComponent implements OnInit {
  step = 1;
  apartamentos: Apartamento[] = [];
  predios: Predio[] = [];
  formApto!: FormGroup;
  formChecks!: FormGroup;
  currentUserId: number | undefined;
  comodidades = [
    { key: 'ar_condicionado', label: 'Ar Condicionado' },
    { key: 'secador_cabelo', label: 'Secador de Cabelo' },
    { key: 'smart_tv', label: 'Smart TV' },
    { key: 'tv_aberta', label: 'TV Aberta' },
    { key: 'cafeteira', label: 'Cafeteira' },
    { key: 'escritorio', label: 'Escritório' },
    { key: 'aspirador_de_po', label: 'Aspirador de Pó' },
    { key: 'ventilador', label: 'Ventilador' },
    { key: 'ferro_passar', label: 'Ferro de Passar' },
    { key: 'sanduicheira', label: 'Sanduicheira' },
    { key: 'chaleira_eletrica', label: 'Chaleira Elétrica' },
    { key: 'liquidificador', label: 'Liquidificador' },
    { key: 'air_fryer', label: 'Air Fryer' },
    { key: 'aquecedor', label: 'Aquecedor' },
    { key: 'itens_limpeza', label: 'Itens de Limpeza' },
    { key: 'totem', label: 'Totem' },
    { key: 'adesivo_aviso', label: 'Adesivo de Aviso' }
  ];

  categorias: Record<string, any[]> = {
    eletrodomesticos: [
      { key: 'geladeira', label: 'Geladeira Funcionando', observavel: true, placeholder: 'Temperatura, ruídos...' },
      { key: 'microondas', label: 'Microondas Funcionando' },
      { key: 'maquina_lavar', label: 'Máquina de Lavar', observavel: true },
      { key: 'tv', label: 'TV Funciona (Smart TV)' },
      { key: 'ar_condicionado', label: 'Ar Condicionado', observavel: true },
      { key: 'cafeteira', label: 'Cafeteira Funcionando' }
    ],
    iluminacao: [
      { key: 'luzes_principal', label: 'Luzes Principais OK' },
      { key: 'luzes_auxiliares', label: 'Luzes Auxiliares OK' },
      { key: 'luzes_externas', label: 'Iluminação Externa OK' }
    ],
    agua: [
      { key: 'chuveiro', label: 'Chuveiro Funcionando', observavel: true },
      { key: 'torneiras', label: 'Torneiras sem Vazamentos' },
      { key: 'vaso_sanitario', label: 'Vaso Sanitário OK' },
      { key: 'pressao_agua', label: 'Pressão da Água Adequada' }
    ],
    seguranca: [
      { key: 'fechaduras', label: 'Fechaduras Operantes' },
      { key: 'senha_porta', label: 'Senha da Porta Correta' }
    ],
    especificos: [
      { key: 'copos', label: 'Jogo de copos Completo', observavel: true },
      { key: 'talheres', label: 'Jogo de Talheres Completo' },
      { key: 'cortinas', label: 'Cortinas Intactas' },
      { key: 'janelas', label: 'Janelas Vedando Bem' },
      { key: 'internet', label: 'Wi-Fi Funcionando', observavel: true }
    ]
  };

  constructor(
    private fb: FormBuilder,
    private aptoSrv: ApartamentoService,
    private predioSrv: PredioService,
    private vistoriaService: VistoriaService,
    private authService: AuthenticationService,

  ) {
    const user: User | null = this.authService.getUser();
    this.currentUserId = user ? user.id : undefined;

  }

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    // Formulário principal
    const formGroup: any = {
      tipo: ['novo', Validators.required],
      apto_id: [null],
      // Informações Básicas
      nome: ['', Validators.required],
      predio_id: [null, Validators.required],
      nome_anuncio: [''],
      // Localização
      endereco: [''],
      bairro: [''],
      andar: [''],
      vaga_garagem: [''],
      // Acesso & Check-in
      senha_porta: [''],
      tipo_checkin: [''],
      acesso_predio: [''],
      acesso_porta: [''],
      link_app: [''],
      // Configurações
      numero_hospedes: [1, [Validators.required, Validators.min(1)]],
      aceita_pet: [false],
      porcentagem_cobrada: [0],
      valor_limpeza: [0],
      valor_enxoval: [0],
      data_troca: [null],
      // Camas & Garrafas
      qtd_cama_solteiro: [0],
      qtd_cama_casal: [0],
      qtd_sofa_cama: [0],
      qtd_taca_vinho: [0],
      // Fogão & Chuveiro
      tipo_fogao: [''],
      tipo_chuveiro: [''],
      // Wi-Fi
      ssid_wifi: [''],
      senha_wifi: [''],
      // Links
      link_airbnb_calendario: [''],
      link_fotos: ['']
    };

    // Adiciona comodidades dinamicamente
    this.comodidades.forEach(amen => {
      formGroup[amen.key] = [false];
    });

    this.formApto = this.fb.group(formGroup);

    // Formulário de checks
    const checksGroup: any = {};
    
    Object.values(this.categorias).forEach(categoria => {
      categoria.forEach((item: any) => {
        checksGroup[item.key] = [false];
        if (item.observavel) {
          checksGroup[item.key + '_obs'] = [''];
        }
      });
    });
    
    checksGroup['observacoes_gerais'] = [''];
    this.formChecks = this.fb.group(checksGroup);
  }

  private loadData(): void {
    this.predioSrv.getAllPredios().subscribe(ps => this.predios = ps);
    this.aptoSrv.getAllApartamentos().subscribe(as => {
      this.apartamentos = as;
      this.setupAptoListeners();
    });
  }

  private setupAptoListeners(): void {
    this.formApto.get('apto_id')!.valueChanges.subscribe(id => {
      const apto = this.apartamentos.find(a => a.id === +id);
      if (apto) {
        const patchValue: any = { ...apto };
        // Formata data para input date
        if (apto.data_troca) {
          patchValue.data_troca = new Date(apto.data_troca).toISOString().split('T')[0];
        }
        this.formApto.patchValue(patchValue);
      }
    });
  }

  next() {
    if (this.formApto.valid) {
      this.step = 2;
    } else {
      this.formApto.markAllAsTouched();
    }
  }

  back() {
    this.step = 1;
  }

  submit() {
    if (this.formChecks.invalid) {
      this.formChecks.markAllAsTouched();
      return;
    }

    // 1) Atualiza o apartamento
    const aptoForm = this.formApto.value;
    const now = new Date().toISOString();
    const apartamentoPayload = {
      ...aptoForm,
      id: aptoForm.apto_id!,
      modificado_user_id: this.currentUserId,
      data_ultima_modificacao: now
    };

    this.aptoSrv.updateApartamento(apartamentoPayload).subscribe({
      next: () => {
        // 2) Monta o objeto Vistoria com TODOS os campos vindos dos formulários
        const vistoriaPayload: Vistoria = {
          apartamento_id: apartamentoPayload.id,
          user_id: this.currentUserId,
          data: now,
          ...this.formChecks.value  // inclui observacoes_gerais e todas as flags/obs
        };

        // 3) Chama o serviço para criar a vistoria
        this.vistoriaService.createVistoria(vistoriaPayload).subscribe({
          next: res => {
            alert(`Vistoria criada com sucesso (ID ${res.vistoriaId})`);
            this.resetForms();
          },
          error: err => {
            console.error('Erro ao criar vistoria:', err);
            alert('Não foi possível criar a vistoria.');
          }
        });
      },
      error: err => {
        console.error('Erro ao atualizar apartamento:', err);
        alert('Não foi possível atualizar o apartamento.');
      }
    });
  }

  private resetForms(): void {
    this.formApto.reset({
      tipo: 'novo',
      numero_hospedes: 1,
      aceita_pet: false,
      porcentagem_cobrada: 0,
      valor_limpeza: 0,
      valor_enxoval: 0
    });
    this.formChecks.reset();
    this.step = 1;
  }
}