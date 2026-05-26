/**
 * EXECUTION LAYER — Tipos (additive-only).
 *
 * Esta camada ENRIQUECE o CoreTradeResult com telemetria e narrativa.
 * NÃO pode mudar nenhum campo canônico do core.
 */

import type { CoreTradeResult } from "@/core/types";

export type ExecutionEventType =
  | "P1"
  | "P2"
  | "N1"
  | "N2"
  | "N3"
  | "N4"
  | "N5"
  | "N6"
  | "N7"
  | "N8"
  | "N9"
  | "N10"
  | "RUNNER_STOP"
  | "STOP_RAW";

export interface ExecutionEvent {
  type: ExecutionEventType;
  bar: number;
  pts: number;
  label: string;
}

/**
 * Trade enriquecido com camada de execução (P2 + events).
 * Campos canônicos do core são preservados byte-a-byte.
 */
export interface EnrichedTradeResult extends CoreTradeResult {
  /** -1 se nunca; índice do toque +350pts. ADDITIVE-ONLY. */
  p2Hit: number;
  executionEvents: ExecutionEvent[];
}

export interface EnrichedDayEngineResult {
  t1: EnrichedTradeResult | null;
  t2: EnrichedTradeResult | null;
}
