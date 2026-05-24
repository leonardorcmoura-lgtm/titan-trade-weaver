/**
 * BARRIER CHECK — proximidade da barreira mais próxima do dia anterior.
 *
 * Port literal de engine/main.js linhas 192-202 (versão dentro de
 * runDayEngine — a versão "pré" das linhas 127-147 é equivalente
 * mas usa contrato diferente; mantemos a versão estruturada {ok,dist}
 * que é a usada efetivamente pelo getSetups dentro do runDayEngine).
 *
 * Comportamento original: barreira NÃO bloqueia entrada — é apenas
 * informação anexada ao setup (decisão do trader).
 */

import type { PrevDay } from "../types";

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
