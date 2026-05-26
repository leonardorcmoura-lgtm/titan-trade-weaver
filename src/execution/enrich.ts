/**
 * ENRICH — combina core + telemetria de execução.
 *
 * Wrapper puro que recebe um CoreTradeResult e retorna EnrichedTradeResult.
 * INVARIANTE: todos os campos do core são preservados byte-a-byte. Esta
 * função APENAS adiciona p2Hit e executionEvents.
 */

import type { Candle, CoreTradeResult } from "@/core/types";
import { runDayEngine } from "@/core/dayEngine";
import type { DayData } from "@/core/types";
import { deriveExecutionEvents } from "./events";
import { trackP2 } from "./p2Tracker";
import type {
  EnrichedDayEngineResult,
  EnrichedTradeResult,
} from "./types";

export function enrichTrade(
  trade: CoreTradeResult,
  candles: Candle[],
): EnrichedTradeResult {
  const p2Hit = trackP2(trade, candles);
  const executionEvents = deriveExecutionEvents(trade, p2Hit);
  return { ...trade, p2Hit, executionEvents };
}

export function runDayEngineEnriched(day: DayData): EnrichedDayEngineResult {
  const core = runDayEngine(day);
  return {
    t1: core.t1 ? enrichTrade(core.t1, day.candles) : null,
    t2: core.t2 ? enrichTrade(core.t2, day.candles) : null,
  };
}
