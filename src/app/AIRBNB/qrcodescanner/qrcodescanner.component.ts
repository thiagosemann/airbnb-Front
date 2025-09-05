import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReservasAirbnbService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/reservas_airbnb_service';
import { ReservaAirbnb } from 'src/app/shared/utilitarios/reservaAirbnb';
import { BarcodeFormat } from '@zxing/library';
import { ToastrService } from 'ngx-toastr';
import { LigarNodeMcuPredioService } from 'src/app/shared/service/Banco_de_Dados/AIRBNB/ligarNodeMcuPredio_service';

@Component({
  selector: 'app-qrcodescanner',
  templateUrl: './qrcodescanner.component.html',
  styleUrls: ['./qrcodescanner.component.css']
})
export class QrcodescannerComponent implements OnInit, OnDestroy {
  reserva: ReservaAirbnb | null = null;
  loading = true;
  error: string | null = null;
  cameraEnabled = false;
  barcodeFormat = BarcodeFormat.QR_CODE;
  leuQrCode:boolean = false;
  cod_reserva: string | null = null;
  portaAbertaSucesso: boolean = false; // Nova variável para controlar o estado de sucesso
  // UX extras
  statusMessage: string = '';
  abrindoPorta: boolean = false;
  diasRestantes: number | null = null;
  allowedStart: Date | null = null;
  allowedEnd: Date | null = null;
  validadeTexto: string | null = null;
  private refreshIntervalId: any = null;

  constructor(
    private route: ActivatedRoute,
    private reservasService: ReservasAirbnbService,
    private ligarNodeMcuPredioService: LigarNodeMcuPredioService,
    private toastr: ToastrService
    
  ) {}

  ngOnInit(): void {
    const auth = this.route.snapshot.paramMap.get('auth');
    if (!auth) {
      this.error = 'Código de autenticação não informado na URL.';
      this.loading = false;
      return;
    }
    this.cod_reserva = auth;
    this.reservasService.getReservaByCodReserva(auth).subscribe({
      next: (reservaAux) => {
        const reserva = reservaAux[0];
        if (!reserva) {
          this.error = 'Reserva não encontrada.';
        } else {
          this.reserva = reserva; // manter para exibir dados mesmo quando fora da janela
          const agora = new Date();
          const start = new Date(reserva.start_date);
          const end = new Date(reserva.end_data);

          // Definir janelas com base em check-in e check-out
          const parseHM = (t?: string | null): { h: number; m: number } => {
            if (!t || !/^\d{2}:\d{2}$/.test(t)) return { h: 0, m: 0 };
            const [h, m] = t.split(':').map((n) => Number(n));
            return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
          };
          const ci = parseHM(reserva.check_in || '15:00');
          const co = (() => {
            const parsed = parseHM(reserva.check_out || '11:00');
            // Para segurança, se vier 00:00, use 23:59 como padrão amplo
            return parsed.h === 0 && parsed.m === 0 ? { h: 23, m: 59 } : parsed;
          })();

          const allowedStart = new Date(start);
          allowedStart.setHours(ci.h, ci.m, 0, 0);
          const allowedEnd = new Date(end);
          allowedEnd.setHours(co.h, co.m, 0, 0);
          this.allowedStart = allowedStart;
          this.allowedEnd = allowedEnd;

          // Atualiza estado agora e agenda atualização a cada minuto
          this.updateAccessState();
          if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
          }
          this.refreshIntervalId = setInterval(() => this.updateAccessState(), 1_000);
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Erro ao buscar reservas.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  private updateAccessState(): void {
    if (!this.reserva || !this.allowedStart || !this.allowedEnd) return;
    const agora = new Date();
    const start = new Date(this.reserva.start_date);
    const end = new Date(this.reserva.end_data);

    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;

    // Reset mensagens por ciclo
    this.statusMessage = '';
    this.validadeTexto = null;
    this.error = null;

    if (agora >= this.allowedStart && agora <= this.allowedEnd) {
      this.cameraEnabled = true;
      const msRemaining = Math.max(this.allowedEnd.getTime() - agora.getTime(), 0);
      if (msRemaining >= dayMs) {
        const dias = Math.ceil(msRemaining / dayMs);
        this.validadeTexto = dias === 1 ? '1 dia' : `${dias} dias`;
        this.diasRestantes = dias;
      } else if (msRemaining >= hourMs) {
        const horas = Math.ceil(msRemaining / hourMs);
        this.validadeTexto = horas === 1 ? '1 hora' : `${horas} horas`;
        this.diasRestantes = null;
      } else {
        const minutos = Math.floor(msRemaining / minuteMs);
        const segundosRaw = Math.ceil((msRemaining - minutos * minuteMs) / 1000);
        const segundos = segundosRaw === 60 ? 0 : segundosRaw;
        const adjMin = segundosRaw === 60 ? minutos + 1 : minutos;
        if (adjMin <= 0) {
          this.validadeTexto = segundos === 1 ? '1 segundo' : `${segundos} segundos`;
        } else {
          const minTxt = adjMin === 1 ? '1 minuto' : `${adjMin} minutos`;
          const segTxt = segundos === 1 ? '1 segundo' : `${segundos} segundos`;
          this.validadeTexto = `${minTxt} e ${segTxt}`;
        }
        this.diasRestantes = null;
      }
      this.statusMessage = 'Aponte a câmera para o QR Code para liberar a porta.';
    } else {
      this.cameraEnabled = false;
      // Mensagens amigáveis conforme o caso
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

      if (agora < this.allowedStart) {
        if (sameDay(agora, start)) {
          const diffMs = this.allowedStart.getTime() - agora.getTime();
          if (diffMs < hourMs) {
            const minutos = Math.floor(diffMs / minuteMs);
            const segundosRaw = Math.ceil((diffMs - minutos * minuteMs) / 1000);
            const segundos = segundosRaw === 60 ? 0 : segundosRaw;
            const adjMin = segundosRaw === 60 ? minutos + 1 : minutos;
            if (adjMin <= 0) {
              this.error = segundos === 1
                ? 'Falta 1 segundo para acessar.'
                : `Faltam ${segundos} segundos para acessar.`;
            } else {
              const minTxt = adjMin === 1 ? '1 minuto' : `${adjMin} minutos`;
              const segTxt = segundos === 1 ? '1 segundo' : `${segundos} segundos`;
              this.error = `Faltam ${minTxt} e ${segTxt} para acessar.`;
            }
          } else {
            const hoursRemaining = Math.ceil(diffMs / hourMs);
            this.error = hoursRemaining === 1
              ? 'Falta 1 hora para acessar.'
              : `Faltam ${hoursRemaining} horas para acessar.`;
          }
        } else {
          this.error = 'A data de hoje não está dentro do período da reserva.';
        }
      } else if (agora > this.allowedEnd) {
        if (sameDay(agora, end)) {
          this.error = `O acesso foi encerrado hoje às ${this.reserva.check_out || '11:00'}.`;
        } else {
          this.error = 'A data de hoje não está dentro do período da reserva.';
        }
      } else {
        this.error = 'A data de hoje não está dentro do período da reserva.';
      }
    }
  }

  onQrCodeScanned(result: string) {
    if (this.leuQrCode || this.abrindoPorta) return;
    this.statusMessage = 'Lendo o código e abrindo a porta...';
    this.abrindoPorta = true;
    this.leuQrCode = true;
    if (!this.cod_reserva) {
      this.toastr.error('Código de reserva não disponível.', 'Erro');
      this.leuQrCode = false;
      this.abrindoPorta = false;
      return;
    }
    this.abrirPorta(result);
  }

  private abrirPorta(payload: string) {
    this.ligarNodeMcuPredioService.ligarNodeMcu(payload, this.cod_reserva!).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.cameraEnabled = false;
          this.portaAbertaSucesso = true;
          this.statusMessage = 'Porta aberta com sucesso!';
          this.toastr.success('Porta aberta com sucesso!', 'Sucesso');
        } else {
          this.statusMessage = 'Falha ao abrir a porta. Tente novamente.';
          this.toastr.error('Falha ao abrir a porta.', 'Erro');
          this.leuQrCode = false;
          this.cameraEnabled = true;
        }
        this.abrindoPorta = false;
      },
      error: (err) => {
        this.statusMessage = err?.error?.message || 'Erro ao liberar a porta. Verifique sua conexão e tente novamente.';
        this.toastr.error(this.statusMessage);
        this.leuQrCode = false;
        this.abrindoPorta = false;
        this.cameraEnabled = true;
      },
    });
  }

  // Método para reiniciar o processo
  reiniciarProcesso() {
    this.portaAbertaSucesso = false;
    this.leuQrCode = false;
  this.cameraEnabled = true;
  this.abrindoPorta = false;
  this.statusMessage = 'Aponte a câmera para o QR Code para liberar a porta.';
  }
}