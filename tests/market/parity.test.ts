import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "@/market/hashGuard";

const ROOT = process.cwd();

/**
 * PARITY — derivação determinística.
 * Mesmo input + mesmo TITAN_FIXED_TS → mesmo output byte-a-byte.
 */
describe("canonical derivation parity", () => {
  it("rerunning derive-canonical produces identical artifacts", () => {
    const files = [
      "canonical/canonical_trade_log.json",
      "canonical/canonical_metrics.json",
      "canonical/canonical_parameters.json",
      "canonical/canonical_metadata.json",
    ].map((f) => path.join(ROOT, f));

    const before = files.map((f) => sha256OfFile(f));
    execSync("bun scripts/derive-canonical.ts", {
      stdio: "ignore",
      cwd: ROOT,
      env: { ...process.env, TITAN_FIXED_TS: "2026-01-01T00:00:00.000Z" },
    });
    const after = files.map((f) => sha256OfFile(f));
    expect(after).toEqual(before);
  });

  it("canonical_trade_log row count matches raw_trades.csv data lines", () => {
    const csv = fs
      .readFileSync(path.join(ROOT, "canonical/raw_trades.csv"), "utf8")
      .trim()
      .split(/\r?\n/);
    const dataLines = csv.length - 1;
    const log = JSON.parse(
      fs.readFileSync(path.join(ROOT, "canonical/canonical_trade_log.json"), "utf8"),
    );
    expect(log.count).toBe(dataLines);
    expect(log.trades.length).toBe(dataLines);
  });
});
