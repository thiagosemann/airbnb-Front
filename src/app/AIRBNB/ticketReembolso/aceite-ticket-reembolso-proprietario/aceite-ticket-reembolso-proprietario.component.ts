// aceite-ticket-reembolso-proprietario.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TicketReembolsoService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ticketReembolso_service';
import { TicketReembolsoArquivo } from 'src/app/shared/utilitarios/ticketReembolso';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-aceite-ticket-reembolso-proprietario',
  templateUrl: './aceite-ticket-reembolso-proprietario.component.html',
  styleUrls: ['./aceite-ticket-reembolso-proprietario.component.css']
})
export class AceiteTicketReembolsoProprietarioComponent implements OnInit {
  ticket: any = null;
  arquivos: TicketReembolsoArquivo[] = [];
  totalValor: number = 0;
  arquivosVisiveis: Array<{ id: number; type: string; url: any; name?: string }> = [];
  modalImageUrl: string | null = null;
  modalFile: any = null;


  constructor(
    private route: ActivatedRoute,
    private ticketSrv: TicketReembolsoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const auth = this.route.snapshot.paramMap.get('auth');
    if (auth) {
      this.ticketSrv.getReembolsoByAuth(auth).subscribe(ticket => {
        console.log(ticket);
        this.ticket = ticket;
        const arquivos = ticket.arquivos || ticket.files || [];
        this.arquivos = arquivos;
        this.arquivosVisiveis = arquivos.map(a => ({
          id: a.id ?? 0,
          type: a.type,
          url: a.type === 'application/pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(a.imagemBase64) : a.imagemBase64,
          name: a.name || (a.type.startsWith('image') ? 'Imagem' : 'Documento.pdf')
        }));

        this.totalValor = (Number(ticket.valor_material) || 0) + (Number(ticket.valor_mao_obra) || 0);
      });
    }
  }


  statusClass(): string {
    switch (this.ticket?.status) {
      case 'PENDENTE': return 'status-pendente';
      case 'AUTORIZADO': return 'status-autorizado';
      case 'AGUARDANDO PAGAMENTO': return 'status-pagamento';
      case 'PAGO': return 'status-pago';
      case 'CANCELADO': return 'status-cancelado';
      default: return '';
    }
  }
  
  openImageModal(imageUrl: string): void {
    this.modalImageUrl = imageUrl;
  }

  closeImageModal(): void {
    this.modalImageUrl = null;
  }
  getSafePdfUrl(base64: string): any {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`data:application/pdf;base64,${base64}`);
  }
  openFileModal(file: any): void {
    // Detecta base64 puro de PDF
    if ((file.type === 'application/pdf' || file.type === 'pdf') && typeof file.url === 'string') {
      // Se vier como dataurl, extrai o base64
      let base64 = file.url;
      if (base64.startsWith('data:application/pdf;base64,')) {
        base64 = base64.replace('data:application/pdf;base64,', '');
      }
      // Se vier como base64 puro, converte para dataurl seguro
      this.modalFile = { ...file, url: this.getSafePdfUrl(base64) };
    } else if (typeof file.url === 'string' && file.url.startsWith('JVBERi0')) {
      // Se vier como base64 puro, converte para dataurl seguro
      this.modalFile = { ...file, url: this.getSafePdfUrl(file.url) };
    } else {
      this.modalFile = file;
    }
  }
  closeFileModal(): void {
    this.modalFile = null;
  }
  downloadAllFiles(): void {
    this.arquivosVisiveis.forEach(file => {
      let link = document.createElement('a');
      let url = file.url;
      // PDF
      if (file.type === 'application/pdf' || file.type === 'pdf') {
        if (url && url.changingThisBreaksApplicationSecurity) {
          url = url.changingThisBreaksApplicationSecurity;
        }
        if (typeof url === 'string' && url.startsWith('JVBERi0')) {
          url = `data:application/pdf;base64,${url}`;
        }
        link.href = url;
        link.download = file.name || `arquivo_${file.id}.pdf`;
      } else if (file.type && file.type.startsWith('image')) {
        // Imagem
        if (url && url.changingThisBreaksApplicationSecurity) {
          url = url.changingThisBreaksApplicationSecurity;
        }
        if (typeof url === 'string' && !url.startsWith('data:image')) {
          url = `data:image/png;base64,${url}`;
        }
        link.href = url;
        link.download = file.name || `imagem_${file.id}.png`;
      } else {
        link.href = url;
        link.download = file.name || `arquivo_${file.id}`;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
  getFotos(): any[] {
    return this.arquivosVisiveis.filter(f => f.type && f.type.startsWith('image'));
  }
  getDocumentos(): any[] {
    return this.arquivosVisiveis
      .filter(f => f.type === 'application/pdf' || f.type === 'pdf')
      .map((f, idx) => ({
        ...f,
        name: `Arquivo${(idx + 1).toString().padStart(2, '0')}.pdf`
      }));
  }
  downloadFile(file: any): void {
    let url = file.url;
    if (url && url.changingThisBreaksApplicationSecurity) {
      url = url.changingThisBreaksApplicationSecurity;
    }
    if (typeof url === 'string' && url.startsWith('JVBERi0')) {
      url = `data:application/pdf;base64,${url}`;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || `arquivo_${file.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  getSolucaoNome(solucao: string): string {
    switch (solucao) {
      case 'Preventiva': return 'Manutenção Preventiva';
      case 'Corretiva': return 'Manutenção Corretiva';
      case 'Substituicao': return 'Substituição';
      default: return solucao;
    }
  }
  realizarPagamento(): void {
    if(this.ticket && this.ticket.link_pagamento) {
      window.open(this.ticket.link_pagamento, '_blank');
    }
  }
  
}