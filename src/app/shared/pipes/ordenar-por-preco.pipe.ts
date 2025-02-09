// ordenar-por-preco.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ordenarPorPreco'
})
export class OrdenarPorPrecoPipe implements PipeTransform {
  transform(vagas: any[], ordenacaoAsc: boolean): any[] {
    return vagas.sort((a, b) => {
      return ordenacaoAsc ? a.valor_diaria - b.valor_diaria : b.valor_diaria - a.valor_diaria;
    });
  }
}
