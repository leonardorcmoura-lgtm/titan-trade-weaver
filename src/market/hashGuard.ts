/**
 * HASH GUARD — SHA256 utilities. Single source for hashing.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";

export function sha256OfBuffer(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256OfFile(filePath: string): string {
  return sha256OfBuffer(fs.readFileSync(filePath));
}

/** Stable hash of an arbitrary JSON-serializable value. Key order normalized. */
export function sha256OfJson(value: unknown): string {
  return sha256OfBuffer(canonicalJson(value));
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.keys(o)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys(o[k]);
        return acc;
      }, {});
  }
  return v;
}

export function assertHash(
  label: string,
  expected: string,
  actual: string,
): void {
  if (expected !== actual) {
    throw new Error(
      `[hashGuard] ${label} mismatch\n  expected=${expected}\n  actual=  ${actual}`,
    );
  }
}
