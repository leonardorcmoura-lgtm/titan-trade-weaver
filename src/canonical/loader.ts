/**
 * CANONICAL LOADER — leitura read-only dos artefatos canônicos.
 *
 * Verifica hashes contra `canonical/raw_trades.sha256` e
 * `canonical_metadata.json.rawTradesSha256`. Boot falha se houver drift.
 */

import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "@/market/hashGuard";
import type {
  CanonicalMetadata,
  CanonicalMetricsFile,
  CanonicalParameters,
  CanonicalTradeLog,
} from "./types";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "canonical");

function read<T>(file: string): T {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) {
    throw new Error(`[canonical/loader] missing artifact: ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

export interface CanonicalBundle {
  log: CanonicalTradeLog;
  metrics: CanonicalMetricsFile;
  parameters: CanonicalParameters;
  metadata: CanonicalMetadata;
}

export function loadCanonical(): CanonicalBundle {
  const metadata = read<CanonicalMetadata>("canonical_metadata.json");
  const rawCsv = path.join(DIR, "raw_trades.csv");
  if (!fs.existsSync(rawCsv)) {
    throw new Error(`[canonical/loader] missing raw_trades.csv`);
  }
  const actual = sha256OfFile(rawCsv);
  if (actual !== metadata.rawTradesSha256) {
    throw new Error(
      `[canonical/loader] raw_trades.csv hash drift\n  expected=${metadata.rawTradesSha256}\n  actual=  ${actual}`,
    );
  }
  const log = read<CanonicalTradeLog>("canonical_trade_log.json");
  const metrics = read<CanonicalMetricsFile>("canonical_metrics.json");
  const parameters = read<CanonicalParameters>("canonical_parameters.json");
  return { log, metrics, parameters, metadata };
}
