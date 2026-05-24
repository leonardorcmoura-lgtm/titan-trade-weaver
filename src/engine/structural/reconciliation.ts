/**
 * STRUCTURAL RECONCILIATION LAYER
 * ═══════════════════════════════════════════════════════════════════
 *
 * ÚNICA AUTORIDADE OFICIAL para:
 *   • estado estrutural final do trade
 *   • payout financeiro reconciliado
 *   • permissão de T2
 *
 * Nenhum outro módulo (componente React, hook, narrative, chart, UI)
 * pode derivar essas decisões. Toda lógica passa por aqui.
 *
 * Port literal de engine/main.js linhas 13-34.
 */

import { STATE_PAYOUT } from "../constants";
import type { ReconcilableTrade, StructuralState } from "../types";

/**
 * Estado estrutural FINAL do trade.
 *
 * Regra-mãe (engine/main.js:20-24):
 *   • Sem P1 → STOP. Sem P1 não existe runner, quadrado, 0/0 ou N/1.
 *   • Com P1 e quadLevel===0 → '0/0' (P1 atingido, nenhum N fechou).
 *   • Caso contrário → `${quadLevel}/1`.
 *
 * É a ÚNICA fonte de verdade estrutural.
 */
export function deriveStructuralState(T: ReconcilableTrade | null): StructuralState {
  if (!T || T.p1Hit < 0) return "STOP";
  if (T.quadLevel === 0) return "0/0";
  return `${T.quadLevel}/1` as StructuralState;
}

/**
 * Payout financeiro derivado do estado estrutural.
 *
 * Port de engine/main.js:27-29. Fallback preserva o comportamento
 * original: estado desconhecido tratado como STOP se for "STOP",
 * caso contrário como 0/0 (+135).
 *
 * É a ÚNICA fonte de verdade financeira.
 */
export function deriveFinancialPayout(state: StructuralState): number {
  const v = STATE_PAYOUT[state];
  if (v !== undefined) return v;
  return state === "STOP" ? -350 : 135;
}

/**
 * T2 (segundo trade do dia) é permitido APENAS em '0/0'.
 *
 * Port de engine/main.js:32-34. Significado: P1 ocorreu mas nenhum
 * quadrado fechou — o dia ainda tem espaço estrutural para nova
 * entrada.
 *
 * É a ÚNICA fonte de verdade para permissão de T2.
 */
export function deriveAllowT2(state: StructuralState): boolean {
  return state === "0/0";
}
