import { Component, OnInit } from '@angular/core';
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
export class QrcodescannerComponent implements OnInit {
  reserva: ReservaAirbnb | null = null;
  loading = true;
  error: string | null = null;
  cameraEnabled = false;
  barcodeFormat = BarcodeFormat.QR_CODE;
  leuQrCode:boolean = false;
  cod_reserva: string | null = null;
  portaAbertaSucesso: boolean = false; // Nova variável para controlar o estado de sucesso

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
    this.reservasService.getAllReservas().subscribe({
      next: (reservas) => {
        const reserva = reservas.find(r => r.cod_reserva === auth);
        if (!reserva) {
          this.error = 'Reserva não encontrada.';
        } else {
          const hoje = new Date();
          const start = new Date(reserva.start_date);
          const end = new Date(reserva.end_data);
          if (hoje >= start && hoje <= end) {
            this.reserva = reserva;
            this.cameraEnabled = true;
          } else {
            this.error = 'A data de hoje não está dentro do período da reserva.';
          }
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Erro ao buscar reservas.';
        this.loading = false;
      }
    });
  }

  onQrCodeScanned(result: string) {
    if (this.leuQrCode) {
      return;
    }
    this.leuQrCode = true;
    if (!this.cod_reserva) {
      this.toastr.error('Código de reserva não disponível.', 'Erro');
      this.leuQrCode = false;
      return;
    }
    this.ligarNodeMcuPredioService.ligarNodeMcu(result, this.cod_reserva).subscribe({
      next: (response) => {
        if (response && response.success) {
          // Desativar a câmera e mostrar mensagem de sucesso
          this.cameraEnabled = false;
          this.portaAbertaSucesso = true;
          this.toastr.success('Porta aberta com sucesso!', 'Sucesso');
        } else {
          this.toastr.error('Falha ao abrir a porta.', 'Erro');
          this.leuQrCode = false;
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erro ao liberar a porta.');
        this.leuQrCode = false;
      },
    });
  }

  // Método para reiniciar o processo
  reiniciarProcesso() {
    this.portaAbertaSucesso = false;
    this.leuQrCode = false;
    this.cameraEnabled = true;
  }
}