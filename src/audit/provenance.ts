/**
 * PROVENANCE — rastreio formal de origem para qualquer artefato derivado.
 *
 * Toda métrica, dataset ou chart spec carrega um Provenance descrevendo
 * EXATAMENTE como foi obtido. Sem provenance = número órfão = proibido.
 */

import type { EpistemicTag } from "./epistemic";

export interface SourceRef {
  /** Caminho relativo à raiz do projeto. */
  file: string;
  /** SHA256 hex do conteúdo do arquivo no momento da derivação. */
  sha256: string;
}

export interface Period {
  /** ISO date (inclusivo). */
  from: string;
  /** ISO date (inclusivo). */
  to: string;
}

export type Granularity =
  | "trade"
  | "day"
  | "week"
  | "month"
  | "1min"
  | "5min"
  | "daily";

export interface Provenance {
  epistemic: EpistemicTag;
  /** Fórmula textual, em pseudo-código. Auditável humanamente. */
  formula: string;
  granularity: Granularity;
  period: Period;
  /** Inputs com hash. Ordem importa (faz parte do hash do output). */
  sources: SourceRef[];
  /** ISO timestamp em que foi derivado. */
  derivedAt: string;
  /** Script + versão (git sha quando disponível). */
  derivedBy: string;
}
