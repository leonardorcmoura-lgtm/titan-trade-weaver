import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  compareAgainstLock,
  readLockfile,
} from "@/market/reproducibility";

const ROOT = process.cwd();

describe("reproducibility", () => {
  it("lockfile matches current artifacts on disk", () => {
    const lock = readLockfile();
    expect(lock.entries.length).toBeGreaterThan(0);
    const report = compareAgainstLock(lock, lock.entries.map((e) => e.path));
    if (!report.ok) console.error(JSON.stringify(report, null, 2));
    expect(report.ok).toBe(true);
  });

  it("delete + reproduce → same hashes as lockfile", () => {
    const lock = readLockfile();
    const toRemove = lock.entries
      .filter((e) => e.kind === "canonical")
      .map((e) => path.join(ROOT, e.path));
    for (const f of toRemove) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    execSync("bun scripts/reproduce.ts", {
      stdio: "ignore",
      cwd: ROOT,
      env: { ...process.env, TITAN_FIXED_TS: "2026-01-01T00:00:00.000Z" },
    });
    const lock2 = readLockfile();
    const map1 = new Map(lock.entries.map((e) => [e.path, e.sha256]));
    for (const e of lock2.entries) {
      expect(map1.get(e.path), `hash for ${e.path}`).toBe(e.sha256);
    }
  });
});
