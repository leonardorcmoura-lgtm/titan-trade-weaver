import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/**
 * DRIFT — grep estático: nenhum candle/OHLC hardcoded fora das zonas
 * permitidas (core, fixtures de golden tests, próprio market layer).
 */
const ALLOWED_PREFIXES = [
  "src/core/",
  "src/execution/",
  "src/market/",
  "src/audit/",
  "tests/golden/",
  "tests/market/",
  "scripts/",
];

function* walk(dir: string): Generator<string> {
  for (const f of fs.readdirSync(dir)) {
    const abs = path.join(dir, f);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (f === "node_modules" || f.startsWith(".")) continue;
      yield* walk(abs);
    } else if (/\.(ts|tsx)$/.test(f)) {
      yield abs;
    }
  }
}

function isAllowed(rel: string): boolean {
  return ALLOWED_PREFIXES.some((p) => rel.startsWith(p));
}

describe("drift detection", () => {
  const offenders: { file: string; pattern: string; line: number }[] = [];

  for (const abs of walk(path.join(ROOT, "src"))) {
    const rel = path.relative(ROOT, abs);
    if (isAllowed(rel)) continue;
    const text = fs.readFileSync(abs, "utf8");
    text.split(/\r?\n/).forEach((line, i) => {
      // candle-shaped object literal
      if (/\{\s*[oO]\s*:\s*-?\d+(\.\d+)?\s*,\s*[hH]\s*:/.test(line)) {
        offenders.push({ file: rel, pattern: "inline-candle", line: i + 1 });
      }
      // arrays of 4-5 numbers (likely OHLCV row)
      if (/\[\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*,\s*-?\d+/.test(line)) {
        offenders.push({ file: rel, pattern: "ohlc-tuple", line: i + 1 });
      }
    });
  }

  for (const tests of walk(path.join(ROOT, "tests"))) {
    void tests;
  }

  it("no inline candles / OHLC tuples outside allowed paths", () => {
    if (offenders.length > 0) {
      console.error("Drift offenders:\n" + JSON.stringify(offenders, null, 2));
    }
    expect(offenders).toEqual([]);
  });
});
