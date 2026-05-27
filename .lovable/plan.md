# TITAN — Fase 3: Quantitative Authority Layer

Construir a camada institucional **sobre** o core já congelado. Nenhum arquivo em `src/core/`, `src/execution/` ou `tests/golden/` será tocado. Os 8/8 golden tests continuam autoridade comportamental do engine.

---

## Princípio governante

Há **três autoridades disjuntas**, em hierarquia estrita:

```text
CANONICAL (planilha manual)    →  fonte única de métricas REAIS  [OBS]
MARKET (B3 candles)            →  fonte única de OHLC            [OBS]
ENGINE (core parity-locked)    →  fonte única de simulações      [SIM]
```

Qualquer número exibido no app **deve** declarar de qual autoridade veio e por qual pipeline passou. Hardcodes, datasets inline, OHLC literal em estratégia, métrica recalculada em chart = violação.

---

## Estrutura de pastas (nova)

```text
canonical/                     # autoridade da planilha manual
  raw_trades.csv               # input bruto (commitado)
  raw_trades.sha256            # hash do input
  canonical_trade_log.json     # derivado, normalizado
  canonical_metrics.json       # métricas agregadas
  canonical_parameters.json    # params usados na derivação
  canonical_metadata.json      # provenance + timestamps + git sha

market/
  manifests/<dataset>.json     # manifesto por dataset
  signatures/<dataset>.sig     # assinatura HMAC
  hashes/<dataset>.sha256      # hash do parquet/csv
  parquet/                     # binários (gitignored, hashes commitados)

b3/
  WINFUT/{1min,5min,daily}/    # CSVs fonte (commitados se pequenos)

reproducibility/
  pipeline.json                # DAG declarativo
  lockfile.json                # hashes esperados de cada artefato derivado

audit/
  reports/<timestamp>.json     # reconciliation reports
  drift/<timestamp>.json       # diffs detectados

scripts/                       # CLIs executáveis via bun
  derive-canonical.ts          # raw_trades.csv → canonical_*.json
  ingest-market.ts             # b3/*.csv → market/parquet + hashes
  verify-integrity.ts          # valida hashes de tudo
  rebuild-manifesto.ts         # canonical_metrics → manifesto/charts payload
  reproduce.ts                 # apaga derivados e re-roda pipeline inteiro

src/
  canonical/
    types.ts                   # CanonicalTrade, CanonicalMetric, Provenance
    loader.ts                  # lê canonical_*.json (read-only, hash-checked)
    immutableMetrics.ts        # API única que a UI consome
  market/
    canonicalFeed.ts           # única forma de obter Candle[]
    hashGuard.ts               # valida SHA256 antes de servir
    integrity.ts               # checagens estruturais (OHLC sanity)
    validator.ts               # schema + range validation
    reproducibility.ts         # comparação manifest vs realidade
  audit/
    epistemic.ts               # tags [OBS][CALC][SIM][INF][APROX]
    provenance.ts              # rastreio formula+source+granularity+period
  ui/
    (apenas consumidores; zero cálculo)

tests/market/
  integrity.test.ts            # hashes válidos, schema válido
  parity.test.ts               # derivação determinística (input fixo → output fixo)
  drift.test.ts                # detecta candles inline / OHLC hardcoded em src/
  reproducibility.test.ts      # apaga derivados, re-roda, compara byte-a-byte
```

---

## Pipeline canônico (DAG)

```text
raw_trades.csv ──hash──► canonical_trade_log.json
                              │
                              ├──► canonical_metrics.json ──► immutableMetrics.ts ──► UI
                              │                                       │
                              │                                       └──► manifesto renderer
                              │                                       └──► chart renderer
                              └──► canonical_parameters.json
                              └──► canonical_metadata.json

b3/WINFUT/*.csv ──hash──► market/parquet/*.parquet ──► canonicalFeed.ts ──► engine (SIM)
                                                                              │
                                                                              └──► simulation results [SIM]
```

Cada nó do DAG: declara input hashes, output hash, fórmula, granularidade, período, provenance, epistemic tag.

---

## Contrato de métrica (formal)

Toda métrica em `canonical_metrics.json`:

```json
{
  "id": "winrate_t1",
  "value": 0.547,
  "epistemic": "OBS",
  "formula": "count(t1.state != 'STOP') / count(t1)",
  "granularity": "trade",
  "period": { "from": "2024-01-01", "to": "2024-12-31" },
  "source": { "file": "raw_trades.csv", "sha256": "..." },
  "derivedAt": "2026-05-27T...",
  "derivedBy": "scripts/derive-canonical.ts@<git-sha>"
}
```

`immutableMetrics.ts` expõe **apenas** leitura, e valida hash no boot.

---

## Lock rules (CI-enforceable)

1. `reproducibility/lockfile.json` lista hashes esperados de cada artefato derivado.
2. `verify-integrity.ts` compara realidade vs lockfile → exit 1 em drift.
3. `drift.test.ts` faz grep estático em `src/` por padrões proibidos: literais OHLC, arrays de candle inline, números mágicos em charts.
4. Mudança quantitativa exige: novo hash → reconciliation report em `audit/reports/` → bump em `canonical_metadata.json.version`.

---

## Entregáveis desta fase (ordem)

1. **Estrutura + tipos**: pastas, `canonical/types.ts`, `audit/epistemic.ts`, `audit/provenance.ts`.
2. **Canonical pipeline**: `scripts/derive-canonical.ts` + `canonical/loader.ts` + `immutableMetrics.ts`. Aceita CSV vazio/placeholder para bootstrap; usuário forneceria `raw_trades.csv` real depois.
3. **Market authority**: `market/canonicalFeed.ts`, `hashGuard.ts`, `integrity.ts`, `validator.ts`, `reproducibility.ts`. Suporta CSV (parquet fica como hash-only no início — bun não tem parquet nativo barato).
4. **Reproducibility**: `scripts/reproduce.ts` + `reproducibility/pipeline.json` + `lockfile.json`.
5. **Audit**: `scripts/verify-integrity.ts`, reconciliation report writer.
6. **Tests**: `tests/market/{integrity,parity,drift,reproducibility}.test.ts`.
7. **Manifesto/chart rebuild path**: contratos + renderer-side adapters (sem UI nova ainda — só o contrato `ChartSpec` com explainability obrigatória: formula, source, granularity, period, hypothesis, interpretation).
8. **PARITY.md update**: adicionar seção "Quantitative Authority" listando as três autoridades e as lock rules.

---

## O que **não** entra agora

- Nenhuma página/canvas/replay visual (Fase posterior).
- Parquet binário real (usar CSV + hash; trocar para parquet quando tivermos `raw_trades.csv` real e datasets grandes).
- Assinatura criptográfica forte (HMAC com secret local agora; KMS depois).
- Backtesting/quant analytics propriamente ditos — esta fase só constrói o **chão de autoridade** sobre o qual eles serão construídos.

---

## Perguntas que afetam a implementação

1. **raw_trades.csv**: você fornece agora, ou crio um schema + fixture mínima para destravar o pipeline?
2. **Parquet**: bun não lê parquet nativamente. OK começar com CSV+hash e migrar depois, ou quer dependência parquet (`parquetjs`/`hyparquet`) já?
3. **HMAC secret**: usar `process.env.TITAN_SIGNING_KEY` (você define no `.env`) ou hash puro SHA256 sem assinatura nesta fase?

Aprovando, executo na ordem 1→8 sem tocar em `src/core/`, `src/execution/`, `tests/golden/`.
