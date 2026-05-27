/**
 * REPRODUCIBILITY — compara estado atual de artefatos derivados contra
 * o lockfile (reproducibility/lockfile.json).
 *
 * Usado por scripts/verify-integrity.ts e por tests/market/reproducibility.test.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { sha256OfFile } from "./hashGuard";

export interface LockEntry {
  path: string;
  sha256: string;
  bytes: number;
  /** Tag livre, ex: "canonical", "market", "manifest". */
  kind: string;
}

export interface Lockfile {
  version: number;
  generatedAt: string;
  entries: LockEntry[];
}

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, "reproducibility", "lockfile.json");

export function readLockfile(): Lockfile {
  if (!fs.existsSync(LOCK_PATH)) {
    return { version: 1, generatedAt: "", entries: [] };
  }
  return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) as Lockfile;
}

export function writeLockfile(lock: Lockfile): void {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
}

export interface DriftReport {
  ok: boolean;
  missing: string[];
  changed: { path: string; expected: string; actual: string }[];
  unexpected: string[];
}

export function compareAgainstLock(
  lock: Lockfile,
  actualPaths: string[],
): DriftReport {
  const expectedMap = new Map(lock.entries.map((e) => [e.path, e]));
  const actualSet = new Set(actualPaths);
  const missing: string[] = [];
  const changed: DriftReport["changed"] = [];
  for (const e of lock.entries) {
    const abs = path.join(ROOT, e.path);
    if (!fs.existsSync(abs)) {
      missing.push(e.path);
      continue;
    }
    const actual = sha256OfFile(abs);
    if (actual !== e.sha256) {
      changed.push({ path: e.path, expected: e.sha256, actual });
    }
  }
  const unexpected = actualPaths.filter((p) => !expectedMap.has(p));
  return {
    ok: missing.length === 0 && changed.length === 0 && unexpected.length === 0,
    missing,
    changed,
    unexpected,
  };
}

export function buildLockEntry(relPath: string, kind: string): LockEntry {
  const abs = path.join(ROOT, relPath);
  const buf = fs.readFileSync(abs);
  return {
    path: relPath,
    sha256: sha256OfFile(abs),
    bytes: buf.byteLength,
    kind,
  };
}
