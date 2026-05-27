/**
 * MARKET VALIDATOR — schema do CSV de candle.
 *
 * Header esperado: t,o,h,l,c,v   (ISO timestamp, números).
 */

import type { MarketCandle } from "./canonicalFeed";

const REQUIRED = ["t", "o", "h", "l", "c", "v"] as const;

export function validateCandleRow(
  header: string,
  line: string,
  lineNo: number,
  file: string,
): MarketCandle {
  const cols = header.split(",").map((s) => s.trim());
  for (const r of REQUIRED) {
    if (!cols.includes(r)) {
      throw new Error(`[validator] ${file}: missing column "${r}" in header`);
    }
  }
  const values = line.split(",").map((s) => s.trim());
  if (values.length !== cols.length) {
    throw new Error(
      `[validator] ${file}:${lineNo}: column count mismatch (got ${values.length}, expected ${cols.length})`,
    );
  }
  const row: Record<string, string> = {};
  cols.forEach((c, i) => (row[c] = values[i]));
  const num = (k: string): number => {
    const n = Number(row[k]);
    if (!Number.isFinite(n)) {
      throw new Error(`[validator] ${file}:${lineNo}: column "${k}" not numeric (${row[k]})`);
    }
    return n;
  };
  if (!row.t) throw new Error(`[validator] ${file}:${lineNo}: empty t`);
  return {
    t: row.t,
    o: num("o"),
    h: num("h"),
    l: num("l"),
    c: num("c"),
    v: num("v"),
  };
}
