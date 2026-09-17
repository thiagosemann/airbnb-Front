# airbnb-Front

Frontend Angular do sistema de gestão da Forest (operação de apartamentos tipo Airbnb).
Backend: **Forest-Back** (não FRST-BACK — apesar do nome de pasta legado em algumas máquinas).

## Forest UI — sistema de design

Padrão visual novo, adotado tela por tela. **Não é obrigatório migrar tudo de uma vez** —
sempre que uma tela for alterada, aproveite para migrar aos poucos para este padrão.
Telas ainda não migradas continuam com o visual antigo (Bootstrap verde `#198754`) até
serem tocadas.

### Origem da paleta

Não é uma paleta nova inventada para isso: é a identidade que já existe em
`src/app/landing/landing.component.css` (landing "Forest Gestão Patrimonial"), e que já
aparece isolada em alguns componentes recentes (`informacoes-reserva`, `camera-app`,
`performance-apartamentos`, `dashboard-limpeza`). O Forest UI apenas formaliza essa
identidade em classes globais reutilizáveis, em vez de cada tela redefinir suas próprias
cores (o app hoje mistura `#198754`, `#00a699`, `#006400`, azuis e cinzas Tailwind sem
padrão único).

### Onde vive

Todos os tokens e classes `.forest-*` estão em **`src/styles.css`** (global, sem
encapsulamento de componente — qualquer template Angular pode usá-las diretamente).
CSS de componente deve conter só o que é específico daquela tela.

### Tokens (`:root` em `src/styles.css`)

| Papel | Variável | Hex |
|---|---|---|
| Marca (verde-floresta) | `--forest-primary` / `--forest-light` / `--forest-dark` | `#0F392B` / `#1e4c40` / `#082119` |
| Verde suave (superfície) | `--sage` / `--sage-light` | `#e8f0e8` / `#f6f9f6` |
| Fundo | `--cream` / `--cream-dark` | `#F5F5F0` / `#EDEAE3` |
| Dourado (destaque) | `--gold` / `--gold-light` / `--gold-dark` / `--gold-tint` | `#d4af37` / `#e9d177` / `#b8902a` / `#f7ecc9` |
| Terracota (alerta/rua) | `--terracotta` / `--terracotta-dark` / `--terracotta-tint` | `#b5562c` / `#8a3e22` / `#fbe9e0` |
| Texto/neutros | `--ink-900` / `--ink-600` / `--ink-400` | `#16221c` / `#4b5750` / `#7b8279` |
| Bordas | `--line-200` / `--line-100` | `#dfe3de` / `#edf1ea` |
| Tipografia | `--font-heading` / `--font-body` / `--font-mono` | Inter / Inter / JetBrains Mono |
| Raio | `--radius-sm/md/lg` | 8 / 12 / 18px |
| Sombra | `--shadow-sm/md/lg` | ver `styles.css` |

`--font-mono` (JetBrains Mono) é usado **só** para dados densos e tabulares — prazos,
datas, contadores — nunca para texto corrido. Reforça a leitura de "painel operacional"
sem introduzir uma terceira família de fonte decorativa.

### Convenção de cor semântica

Duas famílias de badge, deliberadamente diferentes na forma para não se confundirem:

- **Status** (ciclo de vida: pendente/finalizada/cancelada) → pílula **preenchida**.
  `.forest-badge` + `.forest-badge-pendente` / `-finalizada` / `-cancelada`.
- **Tipo/classificação** (ex.: Rua vs Escritório) → pílula **contorno + ícone**, nunca
  preenchida, para não parecer um status.
  `.forest-tag` + `.forest-tag-rua` (terracota, `bi-signpost-2`) /
  `.forest-tag-escritorio` (dourado, `bi-building`).

"Rua" = terracota (trabalho externo, no endereço do apartamento) e "Escritório" =
dourado (trabalho interno). Essa mesma cor também marca a **"espinha" lateral** de 4px
em linhas de tabela e cards (`.forest-spine-rua` / `.forest-spine-escritorio`), o
elemento de assinatura da Forest UI: o painel de demandas lê-se como um quadro de
despacho — dá para escanear visualmente quem precisa ir à rua vs quem fica no
escritório sem ler nenhum texto.

### Classes principais (`.forest-*`)

- Estrutura de página: `.forest-page`, `.forest-header`, `.forest-eyebrow`,
  `.forest-title-row`, `.forest-title-icon`, `.forest-title`
- Barra de filtros: `.forest-toolbar`, `.forest-controls-row`, `.forest-search`,
  `.forest-btn` (+ `-primary` / `-outline`), `.forest-tabs` / `.forest-tab`,
  `.forest-bullet-group` / `.forest-bullet` (+ `.forest-bullet-dot-*`)
- `.forest-select` — só para campos de formulário (modal), não para filtros da barra
  de topo: filtro de texto livre busca por demanda/apartamento/responsável na mesma
  caixa de busca, e filtros de poucas opções (ex.: tipo) usam `.forest-bullet-group`
  em vez de `<select>` — mais rápido de escanear e não esconde as opções num dropdown
- Tabela: `.forest-table-wrap`, `.forest-table` (cabeçalho `--forest-dark`)
- Card mobile: `.forest-card`, `.forest-card-header`, `.forest-card-title`,
  `.forest-values` / `.forest-value-item`, `.forest-card-actions`
- Badges/tags: `.forest-badge-*` (status), `.forest-tag-*` (tipo), `.forest-spine-*`
- Botões de ícone: `.forest-icon-btn` + `-edit` / `-delete`
- Texto truncado com tooltip: `.forest-truncate-row`, `.forest-clamp`,
  `.forest-info-btn` + `.forest-tooltip`
- Modal: `.forest-modal-backdrop`, `.forest-modal`, `.forest-modal-header/body/footer`,
  `.forest-form-section/row/group`, `.forest-input`, `.forest-textarea`
- Combo com autocomplete: `.forest-apto-combo/dropdown/option/empty`,
  `.forest-combo-caret`
- Vazio: `.forest-empty`
- Dado tabular: `.forest-mono`

Todas respeitam `prefers-reduced-motion` e têm `:focus-visible` visível (contorno
dourado). Testado até largura mobile (sem scroll horizontal).

### Status da migração

| Tela | Status |
|---|---|
| `AIRBNB/Demandas/controle-demandas` | ✅ Migrada (primeira tela, referência do padrão) |
| Demais telas | Visual antigo (Bootstrap verde `#198754`) — migrar quando forem alteradas |

Ao migrar uma nova tela: reutilize as classes `.forest-*` já existentes em vez de criar
CSS de componente para essas mesmas necessidades; só adicione uma classe nova a
`styles.css` se o padrão realmente não cobrir o caso, e documente aqui.
