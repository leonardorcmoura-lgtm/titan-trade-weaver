/**
 * DAY ENGINE — CORE (parity-locked).
 *
 * Port literal de engine/main.js linhas 152-234 (`runDayEngine`).
 *
 *   • Primeiro setup válido → T1.
 *   • T2 só ocorre se T1.allowT2 (autoridade: deriveAllowT2 → '0/0').
 *   • T2 precisa começar APÓS T1: setup2.cfIdx > afterBar.
 *   • Função pura — recebe DayData, retorna CoreDayEngineResult.
 */

import { getSetups } from "./setups";
import { simulateTrade } from "./simulate";
import type { CoreDayEngineResult, DayData } from "./types";

export function runDayEngine(day: DayData): CoreDayEngineResult {
  const setups = getSetups(day.candles, day.pfd, day.prev);

  if (!setups.length) return { t1: null, t2: null };

  const t1 = simulateTrade(setups[0], day.candles);
  const result: CoreDayEngineResult = { t1, t2: null };

  if (t1.allowT2 && setups.length > 1) {
    const afterBar = t1.exitBar >= 0 ? t1.exitBar : t1.setup.entIdx;
    for (let si = 1; si < setups.length; si++) {
      const s = setups[si];
      if (s.cfIdx > afterBar) {
        result.t2 = simulateTrade(s, day.candles);
        break;
      }
    }
  }

  return result;
}
