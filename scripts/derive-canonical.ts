/**
 * DERIVE CANONICAL — raw_trades.csv → canonical_*.json
 *
 * Run: bun scripts/derive-canonical.ts
 *
 * Read-only sobre raw_trades.csv. Escreve:
 *   canonical/raw_trades.sha256
 *   canonical/canonical_trade_log.json
 *   canonical/canonical_metrics.json
 *   canonical/canonical_parameters.json
 *   canonical/canonical_metadata.json
 *
 * Determinístico: mesmo input + mesmos parâmetros → mesmo output byte-a-byte.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { sha256OfFile } from "../src/market/hashGuard";
import type {
  CanonicalMetadata,
  CanonicalMetric,
  CanonicalMetricsFile,
  CanonicalParameters,
  CanonicalState,
  CanonicalTrade,
  CanonicalTradeLog,
} from "../src/canonical/types";
import type { Provenance } from "../src/audit/provenance";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "canonical");
const RAW = path.join(DIR, "raw_trades.csv");
const SCHEMA_VERSION = 1;
const VERSION = 1;
const FIXED_TS = process.env.TITAN_FIXED_TS || new Date().toISOString();

function gitSha(): string | null {
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function parseRawTrades(): CanonicalTrade[] {
  const text = fs.readFileSync(RAW, "utf8").trim();
  const [header, ...lines] = text.split(/\r?\n/);
  const cols = header.split(",");
  return lines.map((line, idx) => {
    const v = line.split(",");
    const row: Record<string, string> = {};
    cols.forEach((c, i) => (row[c.trim()] = (v[i] ?? "").trim()));
    const t: CanonicalTrade = {
      id: row.id || `R${idx + 1}`,
      date: row.date,
      slot: row.slot as CanonicalTrade["slot"],
      dir: Number(row.dir) as 1 | -1,
      setupType: row.setupType as CanonicalTrade["setupType"],
      ep: Number(row.ep),
      state: row.state as CanonicalState,
      payout: Number(row.payout),
      note: row.note || undefined,
    };
    return t;
  });
}

function writeJsonStable(file: string, value: unknown): void {
  // Pretty + trailing newline → diff-friendly + deterministic.
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function makeProvenance(
  formula: string,
  rawHash: string,
  unit: string,
): Provenance {
  void unit;
  return {
    epistemic: "CALC",
    formula,
    granularity: "trade",
    period: derivePeriod(),
    sources: [{ file: "canonical/raw_trades.csv", sha256: rawHash }],
    derivedAt: FIXED_TS,
    derivedBy: `scripts/derive-canonical.ts@${gitSha() ?? "untracked"}`,
  };
}

let _trades: CanonicalTrade[] | null = null;
function trades(): CanonicalTrade[] {
  return (_trades ??= parseRawTrades());
}

function derivePeriod() {
  const ts = trades();
  if (ts.length === 0) return { from: "", to: "" };
  const dates = ts.map((t) => t.date).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

function deriveMetrics(rawHash: string): CanonicalMetric[] {
  const ts = trades();
  const t1 = ts.filter((t) => t.slot === "T1");
  const total = ts.length;
  const wins = ts.filter((t) => t.state !== "STOP").length;
  const stops = ts.filter((t) => t.state === "STOP").length;
  const sumPayout = ts.reduce((a, t) => a + t.payout, 0);
  const t1Wins = t1.filter((t) => t.state !== "STOP").length;

  const m = (
    id: string,
    value: number,
    formula: string,
    unit: string,
  ): CanonicalMetric => ({
    id,
    value,
    unit,
    provenance: makeProvenance(formula, rawHash, unit),
  });

  return [
    m("trades_total", total, "count(trades)", "count"),
    m("trades_t1", t1.length, "count(trades where slot=T1)", "count"),
    m("wins_total", wins, "count(trades where state != STOP)", "count"),
    m("stops_total", stops, "count(trades where state = STOP)", "count"),
    m(
      "winrate_total",
      total === 0 ? 0 : wins / total,
      "wins_total / trades_total",
      "%",
    ),
    m(
      "winrate_t1",
      t1.length === 0 ? 0 : t1Wins / t1.length,
      "count(t1 where state != STOP) / count(t1)",
      "%",
    ),
    m("payout_sum", sumPayout, "sum(trade.payout)", "pts"),
    m(
      "payout_avg",
      total === 0 ? 0 : sumPayout / total,
      "payout_sum / trades_total",
      "pts",
    ),
  ];
}

function main(): void {
  if (!fs.existsSync(RAW)) {
    throw new Error(`raw_trades.csv not found at ${RAW}`);
  }
  const rawHash = sha256OfFile(RAW);

  // 1) raw hash file
  fs.writeFileSync(
    path.join(DIR, "raw_trades.sha256"),
    `${rawHash}  raw_trades.csv\n`,
  );

  // 2) trade log
  const log: CanonicalTradeLog = {
    version: VERSION,
    source: { file: "canonical/raw_trades.csv", sha256: rawHash },
    derivedAt: FIXED_TS,
    count: trades().length,
    trades: trades(),
  };
  writeJsonStable(path.join(DIR, "canonical_trade_log.json"), log);

  // 3) metrics
  const metricsFile: CanonicalMetricsFile = {
    version: VERSION,
    generatedAt: FIXED_TS,
    metrics: deriveMetrics(rawHash),
  };
  writeJsonStable(path.join(DIR, "canonical_metrics.json"), metricsFile);

  // 4) parameters
  const params: CanonicalParameters = {
    version: VERSION,
    filters: { dateFrom: null, dateTo: null, excludeStates: [] },
    bucketGranularity: "day",
  };
  writeJsonStable(path.join(DIR, "canonical_parameters.json"), params);

  // 5) metadata
  const meta: CanonicalMetadata = {
    version: VERSION,
    schemaVersion: SCHEMA_VERSION,
    rawTradesSha256: rawHash,
    derivedAt: FIXED_TS,
    derivedBy: `scripts/derive-canonical.ts@${gitSha() ?? "untracked"}`,
    gitSha: gitSha(),
    notes: "Generated by derive-canonical.ts. Do not edit by hand.",
  };
  writeJsonStable(path.join(DIR, "canonical_metadata.json"), meta);

  console.log(`[derive-canonical] OK — ${trades().length} trades, hash=${rawHash.slice(0, 12)}…`);
}

main();
