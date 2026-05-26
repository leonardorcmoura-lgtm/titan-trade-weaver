# src/ui — Visualization Layer

Esta camada é **apenas visual**. Regras:

- NUNCA calcula `structuralState`, `financialResult`, `allowT2`, `p1Hit`,
  `quadLevel`, `exitBar`, `exitPrice` ou qualquer output canônico.
- Sempre consome `CoreTradeResult` (de `@/core`) ou `EnrichedTradeResult`
  (de `@/execution`) — nunca deriva esses campos localmente.
- Pode formatar, animar, agrupar, colorir, narrar — desde que o input
  estrutural venha do engine.

Qualquer label derivado (cores, classes CSS, textos) deve usar os mapas
`TCLASS`/`TEXP`/`BMAP` de `@/core/constants` como autoridade de mapeamento.
