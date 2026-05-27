/**
 * INGEST MARKET — b3/<symbol>/<gran>/<date>.csv → hash files + manifest.
 *
 * Run: bun scripts/ingest-market.ts
 *
 * Não converte para parquet ainda (decisão Fase 3: CSV + hash). Quando
 * dataset crescer, trocar pelo loader parquet preservando a interface
 * `readCanonicalFeed`.
 */

import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "../src/market/hashGuard";

const ROOT = process.cwd();
const B3 = path.join(ROOT, "b3");
const HASHES = path.join(ROOT, "market", "hashes");
const MANIFESTS = path.join(ROOT, "market", "manifests");

interface ManifestEntry {
  symbol: string;
  granularity: string;
  date: string;
  csv: string;
  sha256: string;
  bytes: number;
}

function walk(): ManifestEntry[] {
  const out: ManifestEntry[] = [];
  if (!fs.existsSync(B3)) return out;
  for (const symbol of fs.readdirSync(B3)) {
    const symDir = path.join(B3, symbol);
    if (!fs.statSync(symDir).isDirectory()) continue;
    for (const gran of fs.readdirSync(symDir)) {
      const granDir = path.join(symDir, gran);
      if (!fs.statSync(granDir).isDirectory()) continue;
      for (const f of fs.readdirSync(granDir)) {
        if (!f.endsWith(".csv")) continue;
        const abs = path.join(granDir, f);
        const date = f.replace(/\.csv$/, "");
        const sha = sha256OfFile(abs);
        const bytes = fs.statSync(abs).size;
        out.push({
          symbol,
          granularity: gran,
          date,
          csv: path.relative(ROOT, abs),
          sha256: sha,
          bytes,
        });
        fs.writeFileSync(
          path.join(HASHES, `${symbol}_${gran}_${date}.sha256`),
          `${sha}  ${path.relative(ROOT, abs)}\n`,
        );
      }
    }
  }
  return out;
}

function main(): void {
  fs.mkdirSync(HASHES, { recursive: true });
  fs.mkdirSync(MANIFESTS, { recursive: true });
  const entries = walk();
  const manifest = {
    version: 1,
    generatedAt: process.env.TITAN_FIXED_TS || new Date().toISOString(),
    count: entries.length,
    entries,
  };
  fs.writeFileSync(
    path.join(MANIFESTS, "datasets.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`[ingest-market] OK — ${entries.length} dataset(s) hashed.`);
}

main();
