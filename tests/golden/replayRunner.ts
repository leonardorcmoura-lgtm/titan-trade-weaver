/**
 * REPLAY RUNNER — executor determinístico para golden cases.
 *
 * Recebe um GoldenCase, roda `simulateTrade` do CORE e retorna o
 * resultado bruto. Não faz nenhum tratamento — qualquer drift aparece
 * direto nos asserts de paridade.
 */

import { simulateTrade } from "@/core/simulate";
import type { CoreTradeResult } from "@/core/types";
import type { GoldenCase } from "./scenarios";

export function replay(c: GoldenCase): CoreTradeResult {
  return simulateTrade(c.setup, c.candles);
}
