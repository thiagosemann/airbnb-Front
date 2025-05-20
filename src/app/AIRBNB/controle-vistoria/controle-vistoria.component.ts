// src/app/controle-vistoria/controle-vistoria.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { VistoriaService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/vistoria_service';
import { Vistoria } from 'src/app/shared/utilitarios/vistoria';

@Component({
  selector: 'app-controle-vistoria',
  templateUrl: './controle-vistoria.component.html',
  styleUrls: ['./controle-vistoria.component.css']
})
export class ControleVistoriaComponent implements OnInit {
  vistorias: Vistoria[] = [];
  vistoriasFiltradas: Vistoria[] = [];
  showModal = false;
  isEditing = false;
  form!: FormGroup;
  selectedId?: number;

  // configuração dos checklists para ngFor
  eletros = [
    { key: 'geladeira', label: 'Geladeira' },
    { key: 'microondas', label: 'Micro-ondas' },
    { key: 'maquina_lavar', label: 'Máquina de Lavar' },
    { key: 'tv', label: 'TV' },
    { key: 'ar_condicionado', label: 'Ar Condicionado' },
    { key: 'cafeteira', label: 'Cafeteira' },
  ];
  iluminacao = ['luzes_principal','luzes_auxiliares','luzes_externas'];
  agua = [
    { key: 'chuveiro', label: 'Chuveiro', },
    { key: 'torneiras', label: 'Torneiras' },
    { key: 'vaso_sanitario', label: 'Vaso Sanitário' },
    { key: 'pressao_agua', label: 'Pressão da Água' },
  ];
  seguranca = [
    { key: 'fechaduras', label: 'Fechaduras' },
    { key: 'senha_porta', label: 'Senha da Porta' },
    { key: 'extintor', label: 'Extintor' },
  ];
  itensEspecificos = [
    { key: 'copos', label: 'Copos'},
    { key: 'talheres', label: 'Talheres' },
    { key: 'cortinas', label: 'Cortinas' },
    { key: 'janelas', label: 'Janelas' },
    { key: 'internet', label: 'Internet' },
  ];

  constructor(
    private service: VistoriaService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadVistorias();
    this.initForm();
  }

  loadVistorias() {
    this.service.getAllVistorias().subscribe(list => {
      console.log(list)
      this.vistorias = list;
      this.vistoriasFiltradas = [...list];
    });
  }

  initForm() {
    const controls: any = {
      apartamento_id: ['', Validators.required],
      user_id: ['', Validators.required],
      data: ['', Validators.required],
      observacoes_gerais: ['']
    };
    // adicionar todos os checkboxes e seus campos de observação
    [...this.eletros, ...this.agua, ...this.seguranca, ...this.itensEspecificos].forEach(cfg => {
      controls[cfg.key] = [false];
    });
    this.iluminacao.forEach(key => controls[key] = [false]);

    this.form = this.fb.group(controls);
  }

  filtrarVistorias(event: any) {
    const term = event.target.value.toLowerCase();
    this.vistoriasFiltradas = this.vistorias.filter(v =>
      v.apartamento_id.toString().includes(term) ||
      v.data.toLowerCase().includes(term)
    );
  }

  abrirModal() {
    this.isEditing = false;
    this.selectedId = undefined;
    this.form.reset();
    this.showModal = true;
  }

  editarVistoria(v: Vistoria) {
    this.isEditing = true;
    this.selectedId = v.id;
    // patchValues converte data em input datetime-local
    const dt = new Date(v.data);
    const iso = dt.toISOString().substring(0,16);
    this.form.patchValue({ ...v, data: iso });
    this.showModal = true;
  }

  fecharModal() {
    this.showModal = false;
  }

  onSubmit() {
    const payload: Vistoria = {
      ...this.form.value,
      data: new Date(this.form.value.data).toISOString()
    };
    if (this.isEditing && this.selectedId != null) {
      this.service.updateVistoria(this.selectedId, payload).subscribe(() => {
        this.loadVistorias();
        this.fecharModal();
      });
    } else {
      this.service.createVistoria(payload).subscribe(() => {
        this.loadVistorias();
        this.fecharModal();
      });
    }
  }

  excluirVistoria(id: number) {
    if (!confirm('Confirma a exclusão desta vistoria?')) return;
    this.service.deleteVistoria(id).subscribe(() => this.loadVistorias());
  }
  redirectToVistoria():void{
    this.router.navigate(['/vistoria']);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    // força locale pt-BR; ajuste para 'en-US' se preferir outro idioma
    return date.toLocaleString('pt-BR', options);
  }
}
