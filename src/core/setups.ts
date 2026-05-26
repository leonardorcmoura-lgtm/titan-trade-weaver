/**
 * SETUP DETECTION — CORE (parity-locked).
 *
 * Port literal de engine/main.js linhas 235-317. Preserva:
 *   • opening CF pair (janela de 6 barras)
 *   • C1
 *   • scan geral, bar > 40, pausa (cnt), VWAP, fibo 50%
 *   • kill on `f`, substituição/oposição de CF
 *   • PATCH: CF nascido após `f` é INVÁLIDO (ambos call sites)
 *
 * Barreira é anexada — NÃO bloqueia.
 */

import { checkBarrier } from "./barrier";
import type { Candle, PrevDay, Setup } from "./types";

const VWAP_VALID_MIN = 50000;
const BAR40_LIMIT = 40;
const OPENING_WINDOW = 6;

export function getSetups(
  candles: Candle[],
  pfd: -1 | 0 | 1,
  prev: PrevDay | null,
): Setup[] {
  const cs = candles;
  const n = cs.length;
  const setups: Setup[] = [];
  const skip: Record<number, boolean> = {};

  // ── OPENING CF PAIR ──────────────────────────────────────────────
  const oCFs: { i: number; dir: 1 | -1 }[] = [];
  for (let i = 0; i < Math.min(OPENING_WINDOW, n); i++) {
    if (cs[i].isCF) {
      if (i > 0 && cs[i - 1].isF) continue; // PATCH #1
      oCFs.push({ i, dir: cs[i].cfbull ? 1 : -1 });
    }
  }
  if (oCFs.length >= 2) {
    const d1 = oCFs[0].dir;
    const d2 = oCFs[1].dir;
    if (d1 === d2) {
      if (pfd !== 0 && d1 === pfd) {
        skip[oCFs[0].i] = true;
        skip[oCFs[1].i] = true;
      }
    } else {
      skip[oCFs[0].i] = true;
      skip[oCFs[1].i] = true;
    }
  }

  // ── C1 ───────────────────────────────────────────────────────────
  if (oCFs.length > 0 && oCFs[0].i === 0 && !skip[0]) {
    const c0 = cs[0];
    const d: 1 | -1 = c0.cfbull ? 1 : -1;
    const vok =
      c0.vw > VWAP_VALID_MIN
        ? (d === 1 && c0.cl > c0.vw) || (d === -1 && c0.cl < c0.vw)
        : true;
    const fok =
      c0.fbmid > 0
        ? (d === 1 && c0.cl > c0.fbmid) || (d === -1 && c0.cl < c0.fbmid)
        : true;
    if (vok && fok && n > 1) {
      const nc = cs[1];
      const nd: 1 | -1 = nc.bull ? 1 : -1;
      if (!nc.isCF && !nc.isF && nd === d) {
        const nv =
          nc.vw > VWAP_VALID_MIN
            ? (d === 1 && nc.cl > nc.vw) || (d === -1 && nc.cl < nc.vw)
            : true;
        const nf =
          nc.fbmid > 0
            ? (d === 1 && nc.cl > nc.fbmid) || (d === -1 && nc.cl < nc.fbmid)
            : true;
        if (nv && nf) {
          const ep1 = nc.cl;
          const b = checkBarrier(ep1, d, prev);
          setups.push({
            cfIdx: 0,
            entIdx: 1,
            dir: d,
            type: "C1",
            ep: ep1,
            barrierOk: b.ok,
            barrierDist: b.dist,
          });
        }
      }
    }
  }

  // ── SCAN GERAL ───────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const c = cs[i];
    if (!c.isCF || skip[i]) continue;
    const bar = i + 1;
    const dir: 1 | -1 = c.cfbull ? 1 : -1;
    if (bar > BAR40_LIMIT) continue;
    if (bar >= 4 && c.cnt > 0) continue;
    if (i === 0) continue;

    if (i > 0 && cs[i - 1].isF) continue; // PATCH #2

    if (
      c.vw > VWAP_VALID_MIN &&
      !((dir === 1 && c.cl > c.vw) || (dir === -1 && c.cl < c.vw))
    )
      continue;
    if (
      c.fbmid > 0 &&
      !((dir === 1 && c.cl > c.fbmid) || (dir === -1 && c.cl < c.fbmid))
    )
      continue;

    let entIdx = -1;
    for (let j = i + 1; j < n; j++) {
      const nc = cs[j];
      const nd: 1 | -1 = nc.bull ? 1 : -1;
      if (nc.isF) {
        entIdx = -1;
        break;
      }
      if (nc.isCF) {
        entIdx = -1;
        break;
      }
      if (nd === dir) {
        if (j >= BAR40_LIMIT) {
          entIdx = -1;
          break;
        }
        const nv =
          nc.vw > VWAP_VALID_MIN
            ? (dir === 1 && nc.cl > nc.vw) || (dir === -1 && nc.cl < nc.vw)
            : true;
        const nf =
          nc.fbmid > 0
            ? (dir === 1 && nc.cl > nc.fbmid) ||
              (dir === -1 && nc.cl < nc.fbmid)
            : true;
        if (!nv || !nf) {
          entIdx = -1;
          break;
        }
        entIdx = j;
        break;
      }
    }
    if (entIdx >= 0) {
      const ep2 = cs[entIdx].cl;
      const b = checkBarrier(ep2, dir, prev);
      setups.push({
        cfIdx: i,
        entIdx,
        dir,
        type: bar <= 3 ? "open" : "norm",
        ep: ep2,
        barrierOk: b.ok,
        barrierDist: b.dist,
      });
    }
  }

  return setups;
}
