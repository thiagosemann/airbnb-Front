import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from '../../shared/utilitarios/user';
import { PdfService } from '../../shared/service/Pdf-Service/pdfService';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css']
})
export class ContentComponent implements OnInit {
  mesAtual: string = '';
  valorTotal: number = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      // Se não existe um token, redirecione para a página de login
      this.router.navigate(['/login']);
    }
  }

  getCurrentUser(): User | null {
    let user = localStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    user = sessionStorage.getItem('user');
    if (user) {
      return JSON.parse(user);
    }
    return null;
  }
}
