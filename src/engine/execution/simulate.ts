/**
 * SIMULATE TRADE — Execution + Reconciliation
 *
 * Port literal de engine/main.js linhas 157-190.
 *
 * Caminha as barras a partir de entIdx+1 e produz:
 *   • execution layer (P1 por toque, quadrados por fechamento,
 *     runner stop progressivo via QUADS[q][1])
 *   • structural layer (via deriveStructuralState — única autoridade)
 *   • financial layer (via deriveFinancialPayout — única autoridade)
 *   • allowT2 (via deriveAllowT2 — única autoridade)
 *
 * Regra-mãe: sem P1 não existe runner, quadrado, 0/0 ou N/1.
 */

import { QUADS } from "../constants";
import {
  deriveAllowT2,
  deriveFinancialPayout,
  deriveStructuralState,
} from "../structural/reconciliation";
import type {
  Candle,
  QuadConfirmation,
  Setup,
  TradeResult,
} from "../types";
import { deriveExecutionEvents } from "./events";

const P1_TOUCH = 175;
const STOP_DESLOC = 350;
const BE_PLUS = 50;
const P2_TOUCH = 350;

export function simulateTrade(setup: Setup, candles: Candle[]): TradeResult {
  const ep = setup.ep;
  const dir = setup.dir;
  const stop0 = ep - dir * STOP_DESLOC;
  let runStop = stop0;
  let p1Hit = -1;
  let p1Time = "";
  let p2Hit = -1;
  let quadLevel = 0;
  let exitBar = -1;
  let exitPrice = stop0;
  const quadConfirmed: QuadConfirmation[] = [];
  let p1Active = false;
  const n = candles.length;

  for (let i = setup.entIdx + 1; i < n; i++) {
    const c = candles[i];

    // 1. Stop / runner FIRST
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

    // 2. P1 por TOQUE (high para LONG, low para SHORT)
    const touchD = dir === 1 ? c.h - ep : ep - c.l;
    if (!p1Active && touchD >= P1_TOUCH) {
      p1Hit = i;
      p1Time = c.t;
      p1Active = true;
      runStop = ep + dir * BE_PLUS;
    }

    // 2b. P2 por TOQUE (+350pts) — evento de execução, não estrutural.
    //     Registrado uma vez, sempre que tocado, mesmo após P1.
    if (p2Hit < 0) {
      const touchP2 = dir === 1 ? c.h - ep : ep - c.l;
      if (touchP2 >= P2_TOUCH) p2Hit = i;
    }

    // 3. Quadrados por FECHAMENTO — só após P1
    if (p1Active) {
      const closeD = dir === 1 ? c.cl - ep : ep - c.cl;
      for (let q = QUADS.length - 1; q >= 1; q--) {
        if (closeD >= QUADS[q][0] && quadLevel < q) {
          // Confirma todos os níveis até q (port literal main.js:172-175)
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

  // ── RECONCILIAÇÃO ESTRUTURAL E FINANCEIRA ────────────────────────
  // ÚNICA fonte de verdade — não derivar manualmente em lugar nenhum.
  const structuralState = deriveStructuralState({ p1Hit, quadLevel });
  const allowT2 = deriveAllowT2(structuralState);
  const financialResult = deriveFinancialPayout(structuralState);

  // ── EXECUTION EVENTS ─────────────────────────────────────────────
  // Construído por último pois precisa do TradeResult quase completo.
  const partial: TradeResult = {
    setup,
    ep,
    dir,
    stop0,
    p1Hit,
    p1Time,
    p2Hit,
    quadLevel,
    quadConfirmed,
    runStop,
    exitBar,
    exitPrice,
    QUADS,
    executionEvents: [],
    structuralState,
    allowT2,
    financialResult,
  };
  partial.executionEvents = deriveExecutionEvents(partial);

  return partial;
}
