/**
 * EXECUTION EVENTS — Execution Layer (additive-only).
 *
 * Port literal de engine/main.js linhas 39-63 (`deriveExecutionEvents`).
 *
 * Recebe o CoreTradeResult (já reconciliado) + p2Hit (computado pelo
 * p2Tracker) e produz o log operacional. NÃO chama o reconciliador,
 * NÃO recalcula payout, NÃO altera nada do core.
 */

import type { CoreTradeResult } from "@/core/types";
import type { ExecutionEvent, ExecutionEventType } from "./types";

export function deriveExecutionEvents(
  T: CoreTradeResult,
  p2Hit: number,
): ExecutionEvent[] {
  const events: ExecutionEvent[] = [];

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

  events.push({
    type: "P1",
    bar: T.p1Hit,
    pts: 175,
    label: "P1 toque +175pts → BE+50",
  });

  if (p2Hit >= 0) {
    events.push({
      type: "P2",
      bar: p2Hit,
      pts: 350,
      label: "P2 toque +350pts",
    });
  }

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
