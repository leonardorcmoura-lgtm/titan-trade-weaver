## Escopo — Fase 1 isolada

Implementar **apenas o engine puro** do TITAN em TypeScript. Zero React, zero UI, zero data-loading. Saída: módulos puros e determinísticos sob `src/engine/`, prontos para auditoria contra os 9 critérios definidos.

Após a entrega, rodamos a auditoria estrutural. Data layer, canvas e UI ficam para rodadas seguintes.

## Arquivos a criar

```text
src/engine/
├── constants.ts                  QUADS, STATE_PAYOUT, TCLASS, BMAP, TEXP,
│                                  TICK_VALUE, TICK_SIZE, STOP_PONTOS,
│                                  P1_PONTOS, P1_STOP_BE, N_LEVEL
├── types.ts                      Candle, Setup, TradeResult, DayData,
│                                  ExecutionEvent, StructuralState,
│                                  PrevDay, QuadConfirmation
├── structural/
│   └── reconciliation.ts         deriveStructuralState(T)
│                                  deriveFinancialPayout(state)
│                                  deriveAllowT2(state)
├── detection/
│   ├── barrier.ts                checkBarrier(ep, dir, prev)
│   └── setups.ts                 getSetups(candles, pfd, prev)
├── execution/
│   ├── simulate.ts               simulateTrade(setup, candles)
│   └── events.ts                 deriveExecutionEvents(trade)
└── dayEngine.ts                  runDayEngine({candles, pfd, prev}) → {t1, t2}
```

## Regras de port (não-negociáveis)

1. **Port linha-a-linha** do `main.js` original. Nomes de funções, ordem de checagens, valores de constantes — verbatim.
2. **Reconciliador é a única autoridade**: nenhum módulo fora de `structural/reconciliation.ts` pode atribuir `structuralState` ou calcular payout. `simulateTrade` chama `deriveStructuralState`/`deriveAllowT2` no final, nunca duplica a lógica.
3. **3 camadas separadas** no retorno de `simulateTrade`:
   ```ts
   {
     // execution layer (operacional)
     setup, ep, dir, stop0, p1Hit, p1Time, p2Hit, quadLevel,
     quadConfirmed, runStop, exitBar, exitPrice, QUADS,
     executionEvents,        // ExecutionEvent[]
     // structural layer (reconciliado)
     structuralState,        // 'STOP'|'0/0'|'1/1'|...|'13/1'
     allowT2,                // boolean
     // financial layer (derivado do estrutural)
     financialResult         // number (pontos líquidos)
   }
   ```
4. **Patch `CF após f`** presente em **ambos** os call sites:
   - opening CF pair (primeiras 6 barras) — linha equivalente a `main.js:245`
   - scan geral — linha equivalente a `main.js:284`
   ```ts
   if (i > 0 && candles[i-1].isF) continue;
   ```
5. **P1 por toque** (`h`/`l` ≥175), **quadrado por fechamento** (`cl`), **runner stop progressivo** via `QUADS[q][1]`. Sem P1 → sem runner, sem quadrado, sem 0/0, sem N/1.
6. **`getSetups`** preserva integralmente:
   - C1 (CF na barra 0 com continuidade imediata)
   - opening pair (2 primeiros CFs em 6 barras, com regras de mesma/oposta direção vs `pfd`)
   - scan geral
   - filtros: `bar > 40`, `bar >= 4 && c.cnt > 0` (pausa), VWAP, fibo 50% (`fbmid`)
   - kill on `f` durante busca de continuidade
   - substituição/oposição de CF
7. **Barreira 175pts** via `checkBarrier` retornando `{ok, dist}`, anexada a cada setup mas **não bloqueia** entrada (decisão do trader — comportamento original preservado).
8. **`runDayEngine`** encadeia t1 → t2 só se `t1.allowT2` e `setup2.cfIdx > afterBar`.

## Tipagem

- TS strict, zero `any` no engine.
- `StructuralState = 'STOP' | '0/0' | '1/1' | '2/1' | ... | '13/1'` como union literal.
- `ExecutionEvent = { type: 'P1' | 'P2' | 'N1' | ... | 'RUNNER_STOP' | 'STOP_RAW'; bar; pts; label }`.
- `Candle` reflete exatamente os campos pós-`decode` (`isCF/isF/cfbull/cfbear/fbmax/fbmin/fbmid/fbdir/cnt/lim/bar/bull/o/h/l/cl/vw/t`).

## Determinismo

- Todas as funções são **puras** — não leem `window`, `Date.now()`, `Math.random()`, nem state global.
- Mesma entrada → mesma saída, bit a bit.
- `simulateTrade` e `getSetups` recebem `candles`/`pfd`/`prev` como argumentos (não dependem de `CDAY` global como o original).

## O que NÃO entra nesta fase

- Nenhum `.tsx`, hook, fetch, `decode()`, canvas, narrativa.
- Nenhum arquivo em `src/components/`, `src/hooks/`, `src/analytics/`, `src/intrabar/`, `src/data/`, `src/routes/`.
- Nenhuma alteração em `styles.css` ou `routes/index.tsx`.

## Critérios de auditoria pós-entrega (referência)

Imediatamente após implementação, audito contra:

1. Separação real das 3 camadas no retorno de `simulateTrade`.
2. `deriveStructuralState`/`deriveFinancialPayout`/`deriveAllowT2` como únicos pontos de decisão estrutural/financeira.
3. Zero lógica estrutural fora de `engine/` (trivial nesta fase — só existe engine).
4. `simulateTrade`: P1 por toque, quadrado por close, runner progressivo, `quadConfirmed`, `p2Hit`, `executionEvents`, reconciliação final.
5. `getSetups`: bar40, pausa, VWAP, fibo, continuidade, opening pair, C1, kill on `f`, patch `CF-após-f` nos 2 call sites.
6. Nenhum payout hardcoded fora de `STATE_PAYOUT` / `QUADS`.
7. Nenhum label estrutural hardcoded fora do reconciliador.
8. Nenhuma derivação paralela de estado.
9. Lista de riscos arquiteturais, regressões potenciais, pontos frágeis, acoplamentos remanescentes, funções ainda monolíticas.

## Próximos passos depois da Fase 1

(Fora deste plano — só para contexto.)
- Fase 2: data layer (`decode`, `loadSession`, hooks).
- Fase 3: canvas chart.
- Fase 4: UI/narrativa.
- Fase 5: tema/tokens.

Cada fase recebe auditoria isolada.
