/**
 * Synthetic candle fixtures + setup helpers para golden tests.
 *
 * Não usa decoder real — fabrica `Candle` mínimos com apenas os campos
 * que `simulateTrade` consome (`h`, `l`, `cl`, `t`). Demais campos são
 * preenchidos com defaults inertes para satisfazer o type.
 */

import type { Candle, Setup } from "@/core/types";

export function mk(
  o: number,
  h: number,
  l: number,
  cl: number,
  t = "00:00",
  bar = 0,
): Candle {
  return {
    t,
    o,
    h,
    l,
    cl,
    vw: 0,
    isCF: false,
    isF: false,
    cfbull: false,
    cfbear: false,
    fbmax: 0,
    fbmin: 0,
    fbmid: 0,
    fbdir: 0,
    cnt: 0,
    amp: Math.abs(h - l),
    bodyPct: 0,
    lim: 0,
    bull: cl >= o,
    bar,
  };
}

export function longSetup(ep: number, entIdx = 0): Setup {
  return {
    cfIdx: entIdx > 0 ? entIdx - 1 : 0,
    entIdx,
    dir: 1,
    type: "norm",
    ep,
    barrierOk: true,
    barrierDist: 999,
  };
}

export function shortSetup(ep: number, entIdx = 0): Setup {
  return {
    cfIdx: entIdx > 0 ? entIdx - 1 : 0,
    entIdx,
    dir: -1,
    type: "norm",
    ep,
    barrierOk: true,
    barrierDist: 999,
  };
}
