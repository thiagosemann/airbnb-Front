# FRST

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.0.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Calendário Mobile (`CalendarioMobileComponent`)

Um calendário otimizado para telas pequenas foi adicionado em `src/app/AIRBNB/calendario-mobile/`.

Rota protegida: `/calendarioMobile` (role: admin). Use esta rota em dispositivos móveis ou em simuladores para visualizar a versão compacta.

Principais diferenças para a versão desktop:
- Layout vertical com lista de apartamentos em blocos empilhados.
- Linha de dias com scroll horizontal por apartamento.
- Indicadores simplificados (check-in / check-out / intervalo) usando barras e gradientes.
- Visão detalhada separada por mês com grade 7x.
- Tooltip de check-ins/check-outs otimizado para toque.

Como testar rapidamente no desktop:
1. Abra o navegador devtools e habilite o modo responsivo (ex: 390x844).
2. Acesse `http://localhost:4200/calendarioMobile` após `ng serve`.

Possíveis próximos aprimoramentos:
- Carregamento lazy dos apartamentos (virtual scroll) para muitos registros.
- Suporte a pinch/zoom na grade de dias.
- Parametrização por código do apartamento: ex. `/calendarioMobile?apt=123`.
- Cache local de reservas para navegação mais rápida entre meses.
