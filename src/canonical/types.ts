/**
 * CANONICAL TYPES — schema oficial da planilha manual.
 *
 * `raw_trades.csv` é a ÚNICA fonte de verdade de trades reais. Após
 * derivação ela vira `canonical_trade_log.json` (normalizado) e
 * `canonical_metrics.json` (agregado). UI consome apenas via
 * `immutableMetrics.ts`.
 */

import type { Provenance, SourceRef } from "@/audit/provenance";

/** Estado estrutural normalizado — alinhado com src/core/types.ts. */
export type CanonicalState =
  | "STOP"
  | "0/0"
  | "1/1"
  | "2/1"
  | "3/1"
  | "4/1"
  | "5/1"
  | "6/1"
  | "7/1"
  | "8/1"
  | "9/1"
  | "10/1"
  | "11/1"
  | "12/1"
  | "13/1";

export interface CanonicalTrade {
  /** ID estável e único (linha da planilha ou UUID derivado). */
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** T1 ou T2. */
  slot: "T1" | "T2";
  /** Direção. */
  dir: 1 | -1;
  /** Tipo do setup. */
  setupType: "C1" | "open" | "norm";
  /** Entry price. */
  ep: number;
  /** Estado estrutural reconciliado (autoridade: planilha). */
  state: CanonicalState;
  /** Resultado financeiro (pontos). */
  payout: number;
  /** Observações livres (opcional). */
  note?: string;
}

export interface CanonicalTradeLog {
  version: number;
  source: SourceRef;
  derivedAt: string;
  count: number;
  trades: CanonicalTrade[];
}

export interface CanonicalMetric {
  id: string;
  value: number;
  provenance: Provenance;
  /** Unidade humana (%, pts, count, R$). */
  unit: string;
}

export interface CanonicalMetricsFile {
  version: number;
  generatedAt: string;
  metrics: CanonicalMetric[];
}

export interface CanonicalParameters {
  version: number;
  /** Parâmetros usados na derivação (filtros, períodos, exclusões). */
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
    excludeStates: CanonicalState[];
  };
  bucketGranularity: "day" | "week" | "month";
}

export interface CanonicalMetadata {
  version: number;
  schemaVersion: number;
  rawTradesSha256: string;
  derivedAt: string;
  derivedBy: string;
  gitSha: string | null;
  notes: string;
}
