import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CheckInFormService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/checkinForm_service';

@Component({
  selector: 'app-informacoes-reserva',
  templateUrl: './informacoes-reserva.component.html',
  styleUrls: ['./informacoes-reserva.component.css']
})
export class InformacoesReservaComponent {
  step: 'form' | 'loading' | 'result' = 'form';

  cpf: string = '';
  codReserva: string = '';
  souEstrangeiro: boolean = false;

  reserva: any = null;
  apartamento: any = null;
  predio: any = null;
  faq: any = null;

  constructor(
    private checkinFormService: CheckInFormService,
    private toastr: ToastrService
  ) {}

  buscar() {
    if (!this.cpf) {
      this.toastr.warning(this.souEstrangeiro ? 'Enter your passport number.' : 'Informe o CPF.');
      return;
    }
    if (!this.codReserva) {
      this.toastr.warning('Informe o código da reserva.');
      return;
    }

    this.step = 'loading';
    this.checkinFormService.getInformacoesReserva(this.cpf, this.codReserva).subscribe({
      next: (res) => {
        console.log('Dados recebidos:', res);
        this.reserva = res.reserva;
        this.apartamento = res.apartamento;
        this.predio = res.predio;
        this.faq = res.faq;
        this.step = 'result';
      },
      error: (err) => {
        console.error('Erro ao buscar informações:', err);
        this.toastr.error('Nenhuma reserva encontrada para os dados informados.');
        this.step = 'form';
      }
    });
  }

  novaBusca() {
    this.step = 'form';
    this.cpf = '';
    this.codReserva = '';
    this.reserva = null;
    this.apartamento = null;
    this.predio = null;
    this.faq = null;
    this.souEstrangeiro = false;
  }

  openFaqIndex: number | null = null;

  toggleFaq(i: number) {
    this.openFaqIndex = this.openFaqIndex === i ? null : i;
  }

  getFaq(): { icon: string; pergunta: string; resposta: string }[] {
    const items: { icon: string; pergunta: string; resposta: string }[] = [];
    const f = this.faq;
    if (!f) return items;

    const hasVal = (v: any) => v !== null && v !== undefined && v !== 0 && v !== '';

    if (hasVal(f.andar)) {
      items.push({ icon: 'elevator', pergunta: 'Qual o andar do apartamento?', resposta: `O apartamento está no ${f.andar}º andar.` });
    }

    if (hasVal(f.tipo_chuveiro)) {
      items.push({ icon: 'shower', pergunta: 'Qual o tipo de chuveiro?', resposta: `O chuveiro é do tipo ${f.tipo_chuveiro}.` });
    }

    if (hasVal(f.tipo_fogao)) {
      items.push({ icon: 'local_fire_department', pergunta: 'Qual o tipo de fogão?', resposta: `O fogão é do tipo ${f.tipo_fogao}.` });
    }

    if (hasVal(f.ssid_wifi)) {
      let resp = `O nome da rede Wi-Fi é "${f.ssid_wifi}"`;
      if (hasVal(f.senha_wifi)) resp += ` e a senha é "${f.senha_wifi}"`;
      resp += '.';
      items.push({ icon: 'wifi', pergunta: 'Qual o Wi-Fi do apartamento?', resposta: resp });
    }

    if (hasVal(f.tensao_tomadas)) {
      items.push({ icon: 'electrical_services', pergunta: 'Qual a tensão das tomadas?', resposta: `As tomadas do apartamento são de ${f.tensao_tomadas}V.` });
    }

    if (hasVal(f.possui_tomada_220)) {
      items.push({ icon: 'power', pergunta: 'O apartamento tem tomada 220V?', resposta: 'Sim, o apartamento possui tomada 220V.' });
    }

    if (hasVal(f.roupa_de_cama)) {
      items.push({ icon: 'bed', pergunta: 'Há roupa de cama disponível?', resposta: `Sim, o apartamento disponibiliza: ${f.roupa_de_cama}.` });
    }

    if (hasVal(f.toalha)) {
      items.push({ icon: 'dry', pergunta: 'Há toalhas disponíveis?', resposta: `Sim, o apartamento disponibiliza: ${f.toalha}.` });
    }

    if (hasVal(f.tamanho_vaga)) {
      items.push({ icon: 'directions_car', pergunta: 'Como é a vaga de garagem?', resposta: f.tamanho_vaga });
    }

    if (hasVal(f.localizacao_lixeira)) {
      items.push({ icon: 'delete_outline', pergunta: 'Onde fica a lixeira?', resposta: f.localizacao_lixeira });
    }

    if (hasVal(f.localizacao_lavanderia)) {
      items.push({ icon: 'local_laundry_service', pergunta: 'Onde fica a lavanderia?', resposta: f.localizacao_lavanderia });
    }

    if (hasVal(f.pode_hospede_piscina)) {
      items.push({ icon: 'pool', pergunta: 'Hóspede pode usar a piscina?', resposta: 'Sim! Hóspedes têm acesso à piscina. Consulte a portaria para horários e regras do condomínio.' });
    }

    if (hasVal(f.piscina_aquecida)) {
      items.push({ icon: 'hot_tub', pergunta: 'A piscina é aquecida?', resposta: 'Sim, a piscina do condomínio é aquecida.' });
    }

    if (hasVal(f.exame_piscina)) {
      items.push({ icon: 'assignment', pergunta: 'É necessário exame para usar a piscina?', resposta: 'Sim, é necessário apresentar exame médico para utilizar a piscina. Consulte a portaria para mais informações.' });
    }

    if (f.aceita_pet === 0 || f.aceita_pet === false) {
      items.push({ icon: 'pets', pergunta: 'É permitido pet?', resposta: 'Não é permitido pet no apartamento.' });
    } else if (hasVal(f.aceita_pet)) {
      items.push({ icon: 'pets', pergunta: 'É permitido pet?', resposta: 'Sim, pets são bem-vindos no apartamento!' });
    }

    if (hasVal(f.tv_quarto)) {
      items.push({ icon: 'tv', pergunta: 'O quarto tem TV?', resposta: 'Sim, o quarto possui TV.' });
    }

    return items;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  }

  getAmenities(): { icon: string; label: string }[] {
    if (!this.predio) return [];
    const map: { key: string; icon: string; label: string }[] = [
      { key: 'piscina',               icon: 'pool',                  label: 'Piscina' },
      { key: 'academia',              icon: 'fitness_center',        label: 'Academia' },
      { key: 'churrasqueira',         icon: 'outdoor_grill',         label: 'Churrasqueira' },
      { key: 'salao_de_festas',       icon: 'celebration',           label: 'Salão de Festas' },
      { key: 'espaco_gourmet',        icon: 'restaurant',            label: 'Espaço Gourmet' },
      { key: 'sauna',                 icon: 'hot_tub',               label: 'Sauna' },
      { key: 'spa',                   icon: 'spa',                   label: 'Spa' },
      { key: 'salao_de_jogos',        icon: 'sports_esports',        label: 'Salão de Jogos' },
      { key: 'coworking',             icon: 'work',                  label: 'Coworking' },
      { key: 'jardim_terraco',        icon: 'park',                  label: 'Jardim/Terraço' },
      { key: 'lavanderia',            icon: 'local_laundry_service', label: 'Lavanderia' },
      { key: 'bicicletario',          icon: 'directions_bike',       label: 'Bicicletário' },
      { key: 'estacionamento_visitas',icon: 'local_parking',         label: 'Estacionamento Visitas' },
      { key: 'elevador_social',       icon: 'elevator',              label: 'Elevador Social' },
    ];
    return map.filter(a => this.predio[a.key] === 1 || this.predio[a.key] === true);
  }
}
