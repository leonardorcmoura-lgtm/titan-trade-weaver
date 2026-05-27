/**
 * VERIFY INTEGRITY — re-hash every locked artifact and compare to lockfile.
 *
 * Run: bun scripts/verify-integrity.ts
 * Exit 1 on drift. Designed for CI.
 */

import fs from "node:fs";
import path from "node:path";
import {
  compareAgainstLock,
  readLockfile,
} from "../src/market/reproducibility";

const ROOT = process.cwd();

function listLockedKindPaths(): string[] {
  return readLockfile().entries.map((e) => e.path);
}

function writeReport(report: unknown): string {
  const dir = path.join(ROOT, "audit", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const ts = (process.env.TITAN_FIXED_TS || new Date().toISOString()).replace(
    /[:.]/g,
    "-",
  );
  const p = path.join(dir, `verify-${ts}.json`);
  fs.writeFileSync(p, JSON.stringify(report, null, 2) + "\n");
  return p;
}

function main(): void {
  const lock = readLockfile();
  if (lock.entries.length === 0) {
    console.warn(
      `[verify-integrity] lockfile empty — run "bun scripts/reproduce.ts" first to seed.`,
    );
    process.exit(0);
  }
  const report = compareAgainstLock(lock, listLockedKindPaths());
  const out = writeReport({ ...report, lockfileVersion: lock.version });
  if (!report.ok) {
    console.error(`[verify-integrity] DRIFT detected. Report: ${out}`);
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(`[verify-integrity] OK — ${lock.entries.length} artifact(s) intact.`);
}

main();
