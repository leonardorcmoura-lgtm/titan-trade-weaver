/**
 * EXECUTION EVENTS — Execution Layer
 *
 * Port literal de engine/main.js linhas 39-63.
 *
 * Eventos OPERACIONAIS reais do trade — separados do estado estrutural
 * e do payout. P1/P2/N1.. NÃO são estados finais; são o log do que
 * aconteceu durante a execução.
 *
 * Pré-condição: o trade já foi simulado (TradeResult preenchido).
 * Esta função NÃO chama o reconciliador — apenas relata eventos.
 */

import type {
  ExecutionEvent,
  ExecutionEventType,
  TradeResult,
} from "../types";

export function deriveExecutionEvents(T: TradeResult): ExecutionEvent[] {
  const events: ExecutionEvent[] = [];

  // ── Sem P1: evento de stop bruto (-350) ──────────────────────────
  if (T.p1Hit < 0) {
    if (T.exitBar >= 0) {
      events.push({
        type: "STOP_RAW",
        bar: T.exitBar,
        pts: -350,
        label: "Stop −350pts",
      });
    }
    return events;
  }

  // ── P1: toque do alvo parcial (+175pts) ──────────────────────────
  events.push({
    type: "P1",
    bar: T.p1Hit,
    pts: 175,
    label: "P1 toque +175pts → BE+50",
  });

  // ── P2: toque de +350pts ─────────────────────────────────────────
  if (T.p2Hit >= 0) {
    events.push({
      type: "P2",
      bar: T.p2Hit,
      pts: 350,
      label: "P2 toque +350pts",
    });
  }

  // ── N-Levels confirmados por FECHAMENTO ──────────────────────────
  // Port literal de main.js:52-55. Note que `T.QUADS[qc.q][0]` é o
  // gatilho do nível (não o stop). Mantemos a semântica original.
  for (const qc of T.quadConfirmed) {
    const quad = T.QUADS[qc.q];
    if (!quad) continue;
    const typeKey = `N${qc.q}` as ExecutionEventType;
    events.push({
      type: typeKey,
      bar: qc.bar,
      pts: quad[0],
      label: `N${qc.q} fechamento +${quad[0]}pts → stop +${quad[1]}pts`,
    });
  }

  // ── Runner stop ──────────────────────────────────────────────────
  if (T.exitBar >= 0) {
    const runPts = Math.round((T.exitPrice - T.ep) * T.dir);
    events.push({
      type: "RUNNER_STOP",
      bar: T.exitBar,
      pts: runPts,
      label: `Runner stop @ +${runPts > 0 ? runPts : 0}pts`,
    });
  }

  return events;
}
