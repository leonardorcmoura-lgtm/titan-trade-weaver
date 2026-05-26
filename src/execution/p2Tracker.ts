/**
 * P2 TRACKER — Execution Layer (additive-only).
 *
 * Detecta o toque de +350pts (P2) varrendo as barras a partir de
 * entIdx+1 até exitBar (ou fim do dia). NÃO altera nenhum output
 * canônico do core.
 *
 * Documentação: corrige dead code latente do main.js original
 * (`deriveExecutionEvents` referencia `T.p2Hit` mas `simulateTrade`
 * jamais o computava). Não há mudança operacional oficial — apenas
 * telemetria.
 */

import type { Candle, CoreTradeResult } from "@/core/types";

const P2_TOUCH = 350;

export function trackP2(trade: CoreTradeResult, candles: Candle[]): number {
  const { ep, dir, setup, exitBar } = trade;
  const end = exitBar >= 0 ? exitBar : candles.length - 1;
  for (let i = setup.entIdx + 1; i <= end; i++) {
    const c = candles[i];
    if (!c) break;
    const touch = dir === 1 ? c.h - ep : ep - c.l;
    if (touch >= P2_TOUCH) return i;
  }
  return -1;
}
