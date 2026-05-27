/**
 * REBUILD MANIFESTO — canonical_metrics.json → manifesto payload.
 *
 * Run: bun scripts/rebuild-manifesto.ts
 *
 * Gera `audit/reports/manifesto-<ts>.json` contendo TODAS as métricas com
 * provenance completa. É essa estrutura que o renderer de manifesto / charts
 * deve consumir. Nenhum número fica fora da camada de provenance.
 */

import fs from "node:fs";
import path from "node:path";
import type { CanonicalMetricsFile } from "../src/canonical/types";

const ROOT = process.cwd();
const METRICS = path.join(ROOT, "canonical", "canonical_metrics.json");

function main(): void {
  if (!fs.existsSync(METRICS)) {
    throw new Error(`Missing ${METRICS}. Run derive-canonical.ts first.`);
  }
  const m = JSON.parse(fs.readFileSync(METRICS, "utf8")) as CanonicalMetricsFile;
  const payload = {
    version: 1,
    generatedAt: process.env.TITAN_FIXED_TS || new Date().toISOString(),
    sections: [
      {
        id: "overview",
        title: "Overview",
        metricIds: ["trades_total", "trades_t1", "wins_total", "stops_total"],
      },
      {
        id: "performance",
        title: "Performance",
        metricIds: ["winrate_total", "winrate_t1", "payout_sum", "payout_avg"],
      },
    ],
    metricsIndex: m.metrics.reduce<Record<string, unknown>>((acc, met) => {
      acc[met.id] = met;
      return acc;
    }, {}),
  };
  const out = path.join(ROOT, "audit", "reports");
  fs.mkdirSync(out, { recursive: true });
  const ts = (process.env.TITAN_FIXED_TS || new Date().toISOString()).replace(
    /[:.]/g,
    "-",
  );
  const p = path.join(out, `manifesto-${ts}.json`);
  fs.writeFileSync(p, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[rebuild-manifesto] OK → ${path.relative(ROOT, p)}`);
}

main();
