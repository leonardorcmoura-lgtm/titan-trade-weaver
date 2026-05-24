/**
 * DAY ENGINE — encadeia T1 → T2 do dia.
 *
 * Port literal de engine/main.js linhas 152-234 (runDayEngine).
 *
 * Regras:
 *   • Primeiro setup válido vira T1.
 *   • T2 ocorre APENAS se T1.allowT2 (autoridade: deriveAllowT2 → '0/0').
 *   • T2 precisa começar APÓS T1: setup2.cfIdx > afterBar, onde
 *     afterBar = T1.exitBar (se houve saída) ou T1.entIdx (caso contrário).
 *   • Função pura — recebe DayData, retorna DayEngineResult.
 */

import { getSetups } from "./detection/setups";
import { simulateTrade } from "./execution/simulate";
import type { DayData, DayEngineResult } from "./types";

export function runDayEngine(day: DayData): DayEngineResult {
  const setups = getSetups(day.candles, day.pfd, day.prev);

  if (!setups.length) return { t1: null, t2: null };

  // FIRST valid setup — barreira é apenas informacional (não bloqueia).
  const t1 = simulateTrade(setups[0], day.candles);

  const result: DayEngineResult = { t1, t2: null };

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
