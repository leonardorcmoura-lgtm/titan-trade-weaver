/**
 * SIMULATE TRADE — CORE (parity-locked).
 *
 * Port literal de engine/main.js linhas 157-190 (`simulateTrade`).
 *
 * Precedência intrabar OFICIAL (ver PARITY.md):
 *   1. STOP / RUNNER (wick): break antes de qualquer outra avaliação
 *   2. P1 (wick, +175pts): se !p1Active, ativa e move runStop = ep ± 50
 *   3. QUAD (close, ≥ QUADS[q][0]): só se p1Active; preenche níveis
 *      intermediários; runStop atualizado NÃO é re-testado na mesma barra
 *
 * P2 tracking, narrativa e telemetria pertencem a src/execution/ — esta
 * função emite EXCLUSIVAMENTE os outputs canônicos definidos no PARITY.md.
 */

import {
  BE_PLUS,
  P1_TOUCH,
  QUADS,
  STOP_DESLOC,
} from "./constants";
import {
  deriveAllowT2,
  deriveFinancialPayout,
  deriveStructuralState,
} from "./reconciliation";
import type {
  Candle,
  CoreTradeResult,
  QuadConfirmation,
  Setup,
} from "./types";

export function simulateTrade(
  setup: Setup,
  candles: Candle[],
): CoreTradeResult {
  const ep = setup.ep;
  const dir = setup.dir;
  const stop0 = ep - dir * STOP_DESLOC;
  let runStop = stop0;
  let p1Hit = -1;
  let p1Time = "";
  let quadLevel = 0;
  let exitBar = -1;
  let exitPrice = stop0;
  const quadConfirmed: QuadConfirmation[] = [];
  let p1Active = false;
  const n = candles.length;

  for (let i = setup.entIdx + 1; i < n; i++) {
    const c = candles[i];

    // 1. STOP / RUNNER (wick) — sempre primeiro.
    if (dir === 1 && c.l <= runStop) {
      exitBar = i;
      exitPrice = runStop;
      break;
    }
    if (dir === -1 && c.h >= runStop) {
      exitBar = i;
      exitPrice = runStop;
      break;
    }

    // 2. P1 por TOQUE (wick).
    const touchD = dir === 1 ? c.h - ep : ep - c.l;
    if (!p1Active && touchD >= P1_TOUCH) {
      p1Hit = i;
      p1Time = c.t;
      p1Active = true;
      runStop = ep + dir * BE_PLUS;
    }

    // 3. QUAD por FECHAMENTO — apenas após P1.
    if (p1Active) {
      const closeD = dir === 1 ? c.cl - ep : ep - c.cl;
      for (let q = QUADS.length - 1; q >= 1; q--) {
        if (closeD >= QUADS[q][0] && quadLevel < q) {
          for (let qq = quadLevel + 1; qq <= q; qq++) {
            const already = quadConfirmed.some((x) => x.q === qq);
            if (!already) {
              quadConfirmed.push({
                q: qq,
                bar: i,
                t: c.t,
                cd: Math.round(closeD),
              });
            }
          }
          quadLevel = q;
          runStop = ep + dir * QUADS[q][1];
          break;
        }
      }
    }
  }

  // Reconciliação — ÚNICA fonte de verdade.
  const structuralState = deriveStructuralState({ p1Hit, quadLevel });
  const allowT2 = deriveAllowT2(structuralState);
  const financialResult = deriveFinancialPayout(structuralState);

  return {
    setup,
    ep,
    dir,
    stop0,
    p1Hit,
    p1Time,
    quadLevel,
    quadConfirmed,
    runStop,
    exitBar,
    exitPrice,
    QUADS,
    structuralState,
    allowT2,
    financialResult,
  };
}
