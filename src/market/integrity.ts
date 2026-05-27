/**
 * MARKET INTEGRITY — checagens estruturais sobre OHLC.
 *
 * Não verifica hash (isso é hashGuard); verifica SEMÂNTICA dos candles:
 * h ≥ max(o,c,l), l ≤ min(o,c,h), timestamps monotônicos, sem NaN.
 */

import type { MarketCandle } from "./canonicalFeed";

export function assertOhlcSanity(candles: MarketCandle[], label: string): void {
  let prev: string | null = null;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const max = Math.max(c.o, c.c, c.l);
    const min = Math.min(c.o, c.c, c.h);
    if (!(c.h >= max)) fail(label, i, `h(${c.h}) < max(o,c,l)`);
    if (!(c.l <= min)) fail(label, i, `l(${c.l}) > min(o,c,h)`);
    if (![c.o, c.h, c.l, c.c, c.v].every(Number.isFinite)) {
      fail(label, i, `non-finite OHLCV`);
    }
    if (prev !== null && c.t <= prev) {
      fail(label, i, `non-monotonic timestamp prev=${prev} cur=${c.t}`);
    }
    prev = c.t;
  }
}

function fail(label: string, i: number, msg: string): never {
  throw new Error(`[integrity] ${label} row#${i}: ${msg}`);
}
