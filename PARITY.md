# TITAN — PARITY CONTRACT

> **Status:** PARITY-LOCKED  ·  Engine version: `titan-core v2.0.0`
> **Última auditoria de paridade:** Fase 1.1 (port linha-a-linha vs
> `engine/main.js` linhas 13-34 + 157-190 + 235-317).

Este documento define o **contrato comportamental do core**. Qualquer
mudança em código que altere os outputs canônicos para um mesmo input é
**behavioral drift** e está **proibida** sem revisão formal + atualização
deste documento + atualização dos golden tests.

---

## 1. Outputs canônicos (parity-locked)

`CoreTradeResult` expõe os campos abaixo. Para um mesmo `(Setup, Candle[])`,
estes valores **devem ser bit-exatos** entre versões:

| Campo              | Tipo               | Autoridade |
|--------------------|--------------------|---|
| `structuralState`  | `StructuralState`  | `deriveStructuralState` |
| `financialResult`  | `number`           | `deriveFinancialPayout` |
| `allowT2`          | `boolean`          | `deriveAllowT2` |
| `p1Hit`            | `number` (idx/-1)  | `simulateTrade` (wick) |
| `quadLevel`        | `number` (0..N)    | `simulateTrade` (close) |
| `exitBar`          | `number` (idx/-1)  | `simulateTrade` |
| `exitPrice`        | `number`           | `simulateTrade` |
| `stop0`            | `number`           | `ep - dir * 350` |
| `runStop`          | `number`           | `simulateTrade` |
| `quadConfirmed[]`  | `{q,bar,t,cd?}[]`  | `simulateTrade` |

`CoreDayEngineResult`:

| Campo  | Regra |
|--------|-------|
| `t1`   | `simulateTrade(setups[0])` ou `null` se nenhum setup. |
| `t2`   | `simulateTrade(s)` apenas se `t1.allowT2 === true` E `s.cfIdx > afterBar` onde `afterBar = t1.exitBar ≥ 0 ? t1.exitBar : t1.setup.entIdx`. |

**Qualquer divergência nesses campos para um input idêntico é drift.**

---

## 2. Precedência intrabar OFICIAL

Ordem **determinística** por barra, dentro de `simulateTrade`
(`src/core/simulate.ts`):

```
para i = entIdx+1 .. n-1:
  1. STOP/RUNNER check (wick):
       LONG  → if c.l <= runStop   → exit, BREAK
       SHORT → if c.h >= runStop   → exit, BREAK
  2. P1 touch (wick), apenas se !p1Active:
       touchD = LONG ? (c.h - ep) : (ep - c.l)
       if touchD >= 175 → p1Active=true, runStop = ep ± 50
  3. QUAD close, apenas se p1Active:
       closeD = LONG ? (c.cl - ep) : (ep - c.cl)
       maior q tal que closeD >= QUADS[q][0] e quadLevel < q
       → preenche níveis quadLevel+1..q em quadConfirmed[]
       → quadLevel = q, runStop = ep ± QUADS[q][1]
```

### Regras invioláveis

| Regra | Comportamento |
|-------|---------------|
| **STOP > P1 (same bar)** | Se a vela cruza `runStop` E também tocaria P1, **STOP vence**. Loop quebra antes do touch check. |
| **P1 + QUAD (same bar)** | Permitido. P1 ativa, depois QUAD avalia na mesma iteração. |
| **QUAD não re-testa stop (same bar)** | `runStop` atualizado pelo QUAD só é testado no topo da **próxima** barra. |
| **STOP/P1 usam wick** | `c.l`/`c.h` — não `c.cl`. |
| **QUAD usa close** | `c.cl` — não wicks. |
| **Multi-jump em QUAD** | Confirma TODOS os níveis intermediários `quadLevel+1..q` no mesmo `quadConfirmed[]`. |
| **Sem P1 → STOP** | Regra-mãe: sem P1, não existe runner, quadrado, 0/0 ou N/1. `structuralState = 'STOP'`. |

---

## 3. Reconciliação estrutural

Únicas autoridades, em `src/core/reconciliation.ts`:

```ts
deriveStructuralState({ p1Hit, quadLevel })
  → p1Hit < 0 ? 'STOP'
  : quadLevel === 0 ? '0/0'
  : `${quadLevel}/1`

deriveFinancialPayout(state) → STATE_PAYOUT[state]
deriveAllowT2(state) → state === '0/0'
```

**Proibido** derivar estes valores em qualquer outro lugar
(componente React, hook, narrativa, chart, util). Toda decisão estrutural
ou financeira **deve** passar por essas três funções.

---

## 4. Additive-only divergence (Execution Layer)

Mudanças permitidas SOMENTE se satisfazem TODAS as condições abaixo:

- [x] Deterministic (mesmo input → mesmo output).
- [x] Side-effect free (sem I/O, sem `Date.now`, sem `Math.random`).
- [x] **Não altera** nenhum campo canônico do `CoreTradeResult`.
- [x] **Não altera** `structuralState`, `financialResult`, `allowT2`.

Vivem em `src/execution/`. Exemplos legítimos:

| Item | Justificativa |
|------|---------------|
| `p2Hit` | Toque +350pts, telemetria de execução. Não afeta payout. |
| `executionEvents[]` | Log narrativo P1/P2/N*/RUNNER_STOP/STOP_RAW. |
| `cd` em `quadConfirmed[]` | Snapshot do close delta no momento da confirmação. |
| Narrativa/UI analytics | Formatação humana de eventos do core. |

### Sobre o P2

> P2 tracking corrige **dead code latente** do `main.js` original
> (`deriveExecutionEvents` referenciava `T.p2Hit` mas `simulateTrade`
> nunca o computava — `if(T.p2Hit>=0)` jamais era verdade). A
> implementação atual em `src/execution/p2Tracker.ts` apenas materializa
> o evento que o original pretendia emitir, **sem alterar comportamento
> operacional oficial**. P2 **não pertence ao core**, **não afeta payout,
> structuralState ou allowT2**.

---

## 5. Layer separation (folder lock)

```
src/core/        ← parity-locked, deterministic-only, sem React, sem I/O
src/execution/   ← additive enrichments (telemetria, replay helpers)
src/ui/          ← visualização apenas; nunca calcula outputs oficiais
```

| Camada | Pode importar | NÃO pode importar |
|--------|---------------|---|
| `core/`      | nada externo ao próprio `core/` | `react`, `execution/`, `ui/`, `@/integrations/*` |
| `execution/` | `core/`                          | `react`, `ui/` |
| `ui/`        | `core/`, `execution/`           | nada que recalcule outputs canônicos |

---

## 6. Golden datasets & replay

`tests/golden/` define cenários canônicos com expected outputs explícitos:

- `CASE_001_STOP_NO_P1` — stop antes de P1
- `CASE_002_P1_ONLY` — P1 sem fechamento de N → '0/0'
- `CASE_003_P1_PLUS_N1` — P1 + close +700pts → '1/1'
- `CASE_004_MULTI_JUMP_N2` — close direto em +1050pts → '2/1'
- `CASE_005_STOP_BEATS_P1_SAME_BAR` — wick stop+wick P1 na mesma vela
- `CASE_006_P1_AND_QUAD_SAME_BAR` — P1 e N1 confirmados na mesma vela
- `CASE_007_RUNNER_AFTER_N1` — N1 confirmado, stop subido, exit no novo runStop

Cada cenário valida: `structuralState`, `financialResult`, `allowT2`,
`exitBar`, `exitPrice`, `quadLevel`, `p1Hit`, `quadConfirmed.length`.

Drift = teste falha. Sem exceção.

---

## 7. Proibições (anti-features)

As seguintes técnicas mudam o método e estão **proibidas** no core:

- Intrabar reconstruction (oversampling para sub-barra)
- Tick simulation
- Probabilistic fills (`Math.random`, slippage estocástico)
- Heuristic modifications (re-teste de stop pós-QUAD, etc.)
- Async execution logic
- Dependência implícita de ordem de eventos não documentada aqui

O TITAN é **bar-based**, **deterministic**, **wick/close precedence
driven**. Qualquer técnica que mude essa definição muda o método —
não é mais TITAN.

---

## 8. Procedimento de mudança

Se for absolutamente necessário alterar comportamento do core:

1. Abrir RFC explicando a mudança estrutural.
2. Atualizar este `PARITY.md` (seção afetada + changelog abaixo).
3. Atualizar golden tests com novos expected outputs (com justificativa).
4. Bump da versão (`titan-core vX.Y.Z`).
5. Manter shim de compatibilidade se necessário.

---

## Changelog

- **v2.0.0** (Fase 2) — Lock formal do core. Separação `core/execution/ui`.
  Golden tests + replay infra. P2 movido para execution layer.
- **v1.0.0** (Fase 1) — Port literal de `engine/main.js` para TypeScript.
