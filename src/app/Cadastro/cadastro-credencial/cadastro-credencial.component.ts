import { Component, Input, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CredenciaisReservaService } from '../../shared/service/Banco_de_Dados/AIRBNB/credenciaisReserva_service';
import { CredencialReserva } from '../../shared/utilitarios/credencialReserva';

@Component({
  selector: 'app-cadastro-credencial',
  templateUrl: './cadastro-credencial.component.html',
  styleUrls: ['./cadastro-credencial.component.css']
})
export class CadastroCredencialComponent implements OnInit {
  @Input() reserva_id?: number; // obrigatório para cadastrar (recebido via input)
  @Input() cod_reserva?: string; // opcional

  existing: CredencialReserva[] = [];
  isLoading = false;

  // Preview / upload
  selectedFileName: string | null = null;
  previewDataUrl: string | null = null; // data:*;base64,...
  selectedFileType: string | null = null;

  constructor(
    private service: CredenciaisReservaService,
    private toastr: ToastrService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.reserva_id) this.loadExisting();
  }

  loadExisting() {
    if (!this.reserva_id) return;
    this.isLoading = true;
    this.service.getByReservaId(this.reserva_id).subscribe({
      next: (rows) => {
        this.existing = rows || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar credenciais:', err);
        this.toastr.error('Erro ao carregar credenciais');
        this.isLoading = false;
      }
    });
  }

  onFileChange(event: any) {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    const maxSize = 8 * 1024 * 1024; // 8MB
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) { this.toastr.warning('Envie uma imagem (JPG/PNG) ou PDF.'); return; }
    if (file.size > maxSize) { this.toastr.warning('Arquivo maior que 8MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // manter como data URI para preview e envio
      this.previewDataUrl = result;
      this.selectedFileName = file.name;
      this.selectedFileType = file.type;
      this.toastr.success('Arquivo selecionado.');
    };
    reader.onerror = () => this.toastr.error('Erro ao ler arquivo.');
    reader.readAsDataURL(file);
  }

  save() {
    if (!this.reserva_id) { this.toastr.warning('Reserva não informada.'); return; }
    if (!this.previewDataUrl) { this.toastr.warning('Selecione um arquivo antes de salvar.'); return; }
    this.isLoading = true;
    // armazenar como data URI (mantemos tipo para facilitar preview posterior)
    const arquivoBase64 = this.previewDataUrl; // já é data:...;base64,...
    const payload = {
      reserva_id: this.reserva_id,
      cod_reserva: this.cod_reserva ?? '',
      arquivoBase64
    };
    this.service.createCredencial(payload).subscribe({
      next: (resp) => {
        this.toastr.success('Credencial salva.');
        this.previewDataUrl = null;
        this.selectedFileName = null;
        this.selectedFileType = null;
        this.loadExisting();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao salvar credencial:', err);
        this.toastr.error('Erro ao salvar credencial.');
        this.isLoading = false;
      }
    });
  }

  clearSelection() {
    this.previewDataUrl = null;
    this.selectedFileName = null;
    this.selectedFileType = null;
    // also clear the file input element if present
    try {
      const input = (document.getElementById('cred-file') as HTMLInputElement | null);
      if (input) input.value = '';
    } catch (e) {
      // noop
    }
  }

  viewUrl(item: CredencialReserva): SafeResourceUrl | string {
    if (!item.arquivoBase64) return '';
    const data = item.arquivoBase64 as string;
    if (data.startsWith('data:')) {
      if (data.startsWith('data:application/pdf')) return this.sanitizer.bypassSecurityTrustResourceUrl(data);
      return data; // image data uri is safe to bind to src
    }
    // fallback: try image first
    return 'data:image/*;base64,' + data;
  }

  download(item: CredencialReserva) {
    let base64 = item.arquivoBase64 as string;
    let contentType = '';
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      contentType = parts[0].split(':')[1].split(';')[0];
      base64 = parts[1];
    } else {
      // unknown type -> try png
      contentType = 'application/octet-stream';
    }
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `credencial_${item.id ?? 'file'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  delete(item: CredencialReserva, index: number) {
    if (!item.id) return;
    if (!confirm('Confirma a exclusão desta credencial?')) return;
    this.service.deleteById(item.id).subscribe({
      next: () => {
        this.existing.splice(index, 1);
        this.existing = [...this.existing];
        this.toastr.success('Credencial removida.');
      },
      error: (err) => { console.error(err); this.toastr.error('Erro ao remover credencial.'); }
    });
  }
}
