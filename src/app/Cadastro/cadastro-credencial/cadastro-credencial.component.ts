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

  // Estado de múltiplos uploads automáticos
  uploadingCount = 0;

  // Modal de exclusão
  showDeleteModal = false;
  deleteTarget: CredencialReserva | null = null;
  deleteIndex: number | null = null;

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
    if (!this.reserva_id) { this.toastr.warning('Reserva não informada.'); return; }
    const files: FileList | undefined = event.target.files;
    if (!files || files.length === 0) return;
    const maxSize = 8 * 1024 * 1024; // 8MB
    this.uploadingCount = 0;
    let validCount = 0;

    const processFile = (file: File, dataUrl: string) => {
      const arquivoBase64 = dataUrl; // já data URI
      const payload = { reserva_id: this.reserva_id!, cod_reserva: this.cod_reserva ?? '', arquivoBase64 };
      this.uploadingCount++;
      this.service.createCredencial(payload).subscribe({
        next: () => {
          this.uploadingCount--;
          if (this.uploadingCount === 0) {
            this.toastr.success(validCount > 1 ? 'Arquivos enviados.' : 'Arquivo enviado.');
            this.loadExisting();
          }
        },
        error: (err) => {
          console.error(err);
          this.uploadingCount--;
          this.toastr.error(`Falha ao enviar ${file.name}`);
        }
      });
    };

    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      if (!isImage && !isPdf) { this.toastr.warning(`${file.name}: formato inválido (use JPG/PNG ou PDF).`); return; }
      if (file.size > maxSize) { this.toastr.warning(`${file.name}: maior que 8MB.`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        validCount++;
        processFile(file, result);
      };
      reader.onerror = () => this.toastr.error(`Erro ao ler arquivo: ${file.name}`);
      reader.readAsDataURL(file);
    });

    try { (document.getElementById('cred-file') as HTMLInputElement).value = ''; } catch {}
  }

  // Métodos de pendentes removidos (upload agora automático)

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

  openDelete(item: CredencialReserva, index: number) {
    if (!item.id) return;
    this.deleteTarget = item;
    this.deleteIndex = index;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteIndex = null;
  }

  confirmDelete() {
    if (!this.deleteTarget || this.deleteIndex === null) return;
    const toDelete = this.deleteTarget;
    const idx = this.deleteIndex;
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteIndex = null;
    this.service.deleteById(toDelete.id!).subscribe({
      next: () => {
        this.existing.splice(idx, 1);
        this.existing = [...this.existing];
        this.toastr.success('Credencial removida.');
      },
      error: (err) => { console.error(err); this.toastr.error('Erro ao remover credencial.'); }
    });
  }
}
