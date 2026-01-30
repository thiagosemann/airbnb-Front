import { Component, HostListener } from '@angular/core';

interface Service {
  title: string;
  description: string;
  icon: string;
  large?: boolean;
}

interface Neighborhood {
  name: string;
  baseRevenue: number;
}

@Component({
  selector: 'app-forest-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class ForestLandingComponent {
  isScrolled = false;
  isMobileMenuOpen = false;

  // Calculator form
  selectedBairro = '';
  quartos = 1;
  estimatedRevenue: number | null = null;

  // Neighborhoods with base revenue estimates
  neighborhoods: Neighborhood[] = [
    { name: 'Batel', baseRevenue: 4500 },
    { name: 'Centro', baseRevenue: 3200 },
    { name: 'Água Verde', baseRevenue: 3800 },
    { name: 'Bigorrilho', baseRevenue: 4200 },
    { name: 'Ecoville', baseRevenue: 4000 },
    { name: 'Cabral', baseRevenue: 3500 },
    { name: 'Alto da XV', baseRevenue: 3600 },
    { name: 'Juvevê', baseRevenue: 3400 },
    { name: 'Mercês', baseRevenue: 3300 },
    { name: 'Champagnat', baseRevenue: 4100 }
  ];

  // Services for bento grid
  services: Service[] = [
    {
      title: 'Precificação Dinâmica',
      description: 'Algoritmos inteligentes que ajustam seus preços em tempo real, maximizando sua receita em até 40%.',
      icon: 'trending-up',
      large: true
    },
    {
      title: 'Limpeza 5 Estrelas',
      description: 'Equipe treinada com padrão hoteleiro. Avaliação média de 4.9 em limpeza.',
      icon: 'sparkles'
    },
    {
      title: 'Check-in/out Presencial',
      description: 'Recepção personalizada 24h. Seus hóspedes sempre bem acolhidos.',
      icon: 'key'
    },
    {
      title: 'Manutenção Preventiva',
      description: 'Inspeções regulares e reparos rápidos. Seu imóvel sempre impecável.',
      icon: 'wrench'
    }
  ];

  // Platform logos
  platforms = [
    { name: 'Airbnb', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg' },
    { name: 'Booking.com', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Booking.com_logo.svg' },
    { name: 'VRBO', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/VRBO_Logo.svg' }
  ];

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  calculateRevenue() {
    if (!this.selectedBairro || this.quartos < 1) return;

    const neighborhood = this.neighborhoods.find(n => n.name === this.selectedBairro);
    if (neighborhood) {
      // Base revenue * room multiplier (1 bedroom = 1x, 2 = 1.6x, 3 = 2.1x, etc.)
      const multiplier = 1 + (this.quartos - 1) * 0.6;
      this.estimatedRevenue = Math.round(neighborhood.baseRevenue * multiplier);
    }
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    this.isMobileMenuOpen = false;
  }
}
