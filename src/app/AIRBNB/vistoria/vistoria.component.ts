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
      { key: 'geladeira', label: 'Geladeira Funcionando', placeholder: 'Temperatura, ruídos...' },
      { key: 'microondas', label: 'Microondas Funcionando' },
      { key: 'maquina_lavar', label: 'Máquina de Lavar' },
      { key: 'tv', label: 'TV Funciona (Smart TV)' },
      { key: 'ar_condicionado', label: 'Ar Condicionado' },
      { key: 'cafeteira', label: 'Cafeteira Funcionando' }
    ],
    iluminacao: [
      { key: 'luzes_principal', label: 'Luzes Principais OK' },
      { key: 'luzes_auxiliares', label: 'Luzes Auxiliares OK' },
      { key: 'luzes_externas', label: 'Iluminação Externa OK' }
    ],
    agua: [
      { key: 'chuveiro', label: 'Chuveiro Funcionando' },
      { key: 'torneiras', label: 'Torneiras sem Vazamentos' },
      { key: 'vaso_sanitario', label: 'Vaso Sanitário OK' },
      { key: 'pressao_agua', label: 'Pressão da Água Adequada' }
    ],
    seguranca: [
      { key: 'fechaduras', label: 'Fechaduras Operantes' },
      { key: 'senha_porta', label: 'Senha da Porta Correta' }
    ],
    especificos: [
      { key: 'copos', label: 'Jogo de copos Completo' },
      { key: 'talheres', label: 'Jogo de Talheres Completo' },
      { key: 'cortinas', label: 'Cortinas Intactas' },
      { key: 'janelas', label: 'Janelas Vedando Bem' },
      { key: 'internet', label: 'Wi-Fi Funcionando'}
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

  const aptoForm = this.formApto.value;
  const now = new Date().toISOString();

  // montamos o payload comum de vistoria
  const vistoriaPayloadBase: Partial<Vistoria> = {
    apartamento_id: 0,             // vai ajustar logo abaixo
    user_id: this.currentUserId!,
    data: now,
    ...this.formChecks.value       // flags + observacoes_gerais
  };

  if (aptoForm.tipo === 'novo') {
    // 1a) cria o apartamento
    const createPayload = {
      ...aptoForm,
      modificado_user_id: this.currentUserId,
      data_ultima_modificacao: now
    };

    this.aptoSrv.createApartamento(createPayload as any).subscribe({
      next: (res: any) => {
        const newAptoId = res.insertId;
        // 2a) cria a vistoria de entrada
        const vistoriaPayload = {
          ...vistoriaPayloadBase,
          apartamento_id: newAptoId
        } as Vistoria;

        this.vistoriaService.createVistoria(vistoriaPayload)
          .subscribe(() => {
            alert('Apartamento e vistoria de entrada criados com sucesso!');
            this.resetForms();
          }, err => {
            console.error(err);
            alert('Apartamento criado, mas falhou criar a vistoria.');
          });
      },
      error: err => {
        console.error(err);
        alert('Falha ao criar o apartamento.');
      }
    });

  } else {
    // 1b) atualiza o apartamento existente
    const updatePayload = {
      ...aptoForm,
      id: aptoForm.apto_id!,
      modificado_user_id: this.currentUserId,
      data_ultima_modificacao: now
    };

    this.aptoSrv.updateApartamento(updatePayload as any).subscribe({
      next: () => {
        // 2b) cria a vistoria de saída ou rotina
        const vistoriaPayload = {
          ...vistoriaPayloadBase,
          apartamento_id: updatePayload.id
        } as Vistoria;

        this.vistoriaService.createVistoria(vistoriaPayload)
          .subscribe(() => {
            alert('Apartamento atualizado e vistoria criada com sucesso!');
            this.resetForms();
          }, err => {
            console.error(err);
            alert('Apartamento atualizado, mas falhou criar a vistoria.');
          });
      },
      error: err => {
        console.error(err);
        alert('Falha ao atualizar o apartamento.');
      }
    });
  }
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