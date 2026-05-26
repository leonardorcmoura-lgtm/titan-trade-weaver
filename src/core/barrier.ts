/**
 * BARRIER CHECK — CORE.
 *
 * Port literal de engine/main.js linhas 192-202. Barreira NÃO bloqueia
 * entrada — é apenas metadata anexada ao Setup.
 */

import type { PrevDay } from "./types";

export interface BarrierResult {
  ok: boolean;
  dist: number;
}

const CLEAR_DIST = 999;
const MIN_CLEARANCE = 175;

export function checkBarrier(
  ep: number,
  dir: 1 | -1,
  prev: PrevDay | null,
): BarrierResult {
  if (!prev) return { ok: true, dist: CLEAR_DIST };

  const bars = [
    prev.maximo,
    prev.minimo,
    prev.fechamento,
    prev.abertura,
    prev.ajuste,
  ].filter((v) => v && v > 0);

  if (!bars.length) return { ok: true, dist: CLEAR_DIST };

  const rel =
    dir === 1 ? bars.filter((b) => b > ep) : bars.filter((b) => b < ep);

  if (!rel.length) return { ok: true, dist: CLEAR_DIST };

  const nearest =
    dir === 1 ? Math.min.apply(null, rel) : Math.max.apply(null, rel);
  const dist = Math.abs(nearest - ep);

  return { ok: dist >= MIN_CLEARANCE, dist: Math.round(dist) };
}
