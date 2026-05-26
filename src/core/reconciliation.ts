/**
 * STRUCTURAL RECONCILIATION — CORE (parity-locked).
 *
 * ÚNICA AUTORIDADE OFICIAL para:
 *   • estado estrutural final do trade
 *   • payout financeiro reconciliado
 *   • permissão de T2
 *
 * Nenhum outro módulo (execution, UI, narrative) pode derivar essas
 * decisões. Port literal de engine/main.js linhas 13-34.
 */

import { STATE_PAYOUT } from "./constants";
import type { ReconcilableTrade, StructuralState } from "./types";

export function deriveStructuralState(
  T: ReconcilableTrade | null,
): StructuralState {
  if (!T || T.p1Hit < 0) return "STOP";
  if (T.quadLevel === 0) return "0/0";
  return `${T.quadLevel}/1` as StructuralState;
}

export function deriveFinancialPayout(state: StructuralState): number {
  const v = STATE_PAYOUT[state];
  if (v !== undefined) return v;
  return state === "STOP" ? -350 : 135;
}

export function deriveAllowT2(state: StructuralState): boolean {
  return state === "0/0";
}
