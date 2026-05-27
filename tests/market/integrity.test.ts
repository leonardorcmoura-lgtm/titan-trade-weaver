import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "@/market/hashGuard";

const ROOT = process.cwd();

describe("market/canonical integrity", () => {
  it("raw_trades.sha256 matches raw_trades.csv", () => {
    const csv = path.join(ROOT, "canonical/raw_trades.csv");
    const hashFile = path.join(ROOT, "canonical/raw_trades.sha256");
    expect(fs.existsSync(csv)).toBe(true);
    expect(fs.existsSync(hashFile)).toBe(true);
    const expected = fs.readFileSync(hashFile, "utf8").trim().split(/\s+/)[0];
    expect(sha256OfFile(csv)).toBe(expected);
  });

  it("canonical_metadata.rawTradesSha256 matches raw_trades.csv", () => {
    const meta = JSON.parse(
      fs.readFileSync(path.join(ROOT, "canonical/canonical_metadata.json"), "utf8"),
    );
    const actual = sha256OfFile(path.join(ROOT, "canonical/raw_trades.csv"));
    expect(meta.rawTradesSha256).toBe(actual);
  });

  it("every canonical metric declares full provenance", () => {
    const m = JSON.parse(
      fs.readFileSync(path.join(ROOT, "canonical/canonical_metrics.json"), "utf8"),
    );
    for (const met of m.metrics) {
      expect(met.id).toBeTruthy();
      expect(Number.isFinite(met.value)).toBe(true);
      expect(met.provenance.formula).toBeTruthy();
      expect(met.provenance.epistemic).toBeTruthy();
      expect(met.provenance.sources.length).toBeGreaterThan(0);
      expect(met.provenance.period.from).toBeDefined();
      expect(met.provenance.period.to).toBeDefined();
    }
  });
});
