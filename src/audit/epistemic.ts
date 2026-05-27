/**
 * EPISTEMIC TAGS — marca a natureza de cada número exibido no TITAN.
 *
 * Toda métrica/dado consumido pela UI DEVE declarar uma destas tags.
 * Sem tag = violação de governança (drift.test.ts pega).
 *
 *   OBS    — observação direta (planilha manual, candle B3 lido do disco).
 *   CALC   — cálculo determinístico sobre OBS (winrate, soma, média).
 *   SIM    — saída do engine simulado (src/core/simulate.ts).
 *   INF    — inferência estatística (intervalos, estimadores).
 *   APROX  — aproximação declarada (ex: oversampling, suavização).
 */

export type EpistemicTag = "OBS" | "CALC" | "SIM" | "INF" | "APROX";

export const EPISTEMIC_TAGS = ["OBS", "CALC", "SIM", "INF", "APROX"] as const;

export function isEpistemicTag(v: unknown): v is EpistemicTag {
  return typeof v === "string" && (EPISTEMIC_TAGS as readonly string[]).includes(v);
}
