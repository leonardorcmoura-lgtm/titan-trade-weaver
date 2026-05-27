/**
 * MARKET / canonicalFeed — ÚNICA forma de obter Candle[] em qualquer
 * código do TITAN.
 *
 * Toda leitura de OHLC passa por aqui. CSV é lido do disco, hash é
 * verificado contra `market/hashes/<dataset>.sha256`, schema é validado.
 *
 * PROIBIDO em qualquer outro lugar:
 *   - arrays de candle inline (`const candles = [{o:..., h:...}]`)
 *   - fetch direto de CSV/JSON de mercado
 *   - mocks de OHLC fora de tests/golden/fixtures.ts (golden é exceção
 *     auditada — fixtures sintéticas para parity, não dados de mercado)
 */

import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "./hashGuard";
import { validateCandleRow } from "./validator";
import { assertOhlcSanity } from "./integrity";

export interface MarketCandle {
  t: string; // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface DatasetId {
  symbol: string; // ex: "WINFUT"
  granularity: "1min" | "5min" | "daily";
  /** ISO date — file day-bucket. */
  date: string;
}

const REPO_ROOT = process.cwd();

function csvPath(d: DatasetId): string {
  return path.join(REPO_ROOT, "b3", d.symbol, d.granularity, `${d.date}.csv`);
}

function hashPath(d: DatasetId): string {
  return path.join(
    REPO_ROOT,
    "market",
    "hashes",
    `${d.symbol}_${d.granularity}_${d.date}.sha256`,
  );
}

/**
 * Lê candles do dataset declarado. Falha imediatamente se:
 *   - arquivo não existe
 *   - hash não bate com o esperado
 *   - alguma linha falha schema/sanity
 */
export function readCanonicalFeed(d: DatasetId): MarketCandle[] {
  const csv = csvPath(d);
  if (!fs.existsSync(csv)) {
    throw new Error(`[canonicalFeed] dataset missing: ${csv}`);
  }
  const expected = readExpectedHash(d);
  const actual = sha256OfFile(csv);
  if (expected && expected !== actual) {
    throw new Error(
      `[canonicalFeed] hash mismatch for ${csv}\n  expected=${expected}\n  actual=  ${actual}`,
    );
  }
  const raw = fs.readFileSync(csv, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const header = lines.shift();
  if (!header) throw new Error(`[canonicalFeed] empty csv: ${csv}`);
  const candles: MarketCandle[] = lines.map((line, i) => {
    const row = validateCandleRow(header, line, i + 2, csv);
    return row;
  });
  assertOhlcSanity(candles, csv);
  return candles;
}

function readExpectedHash(d: DatasetId): string | null {
  const p = hashPath(d);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim().split(/\s+/)[0];
}
