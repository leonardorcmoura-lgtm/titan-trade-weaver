/**
 * SETUP DETECTION — getSetups()
 *
 * Port literal de engine/main.js linhas 235-317.
 *
 * Detecta TODOS os setups válidos de um dia, em ordem cronológica.
 * Preserva integralmente:
 *   • opening CF pair (3-6 primeiras barras, regras vs pfd)
 *   • C1 (CF na barra 0 com continuidade imediata, sem pfd check)
 *   • scan geral
 *   • filtros: bar > 40, cnt > 0 (pausa), VWAP, fibo 50% (fbmid)
 *   • kill on `f` durante busca de continuidade
 *   • substituição/oposição de CF
 *   • PATCH: CF nascido imediatamente após `f` é INVÁLIDO
 *     (presente em AMBOS os call sites — opening pair + scan geral)
 *
 * NÃO bloqueia por barreira — barreira é apenas anexada ao setup.
 */

import type { Candle, PrevDay, Setup } from "../types";
import { checkBarrier } from "./barrier";

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

  // ─────────────────────────────────────────────────────────────────
  // OPENING CF PAIR (primeiras barras)
  // Port literal de main.js:241-258.
  // ─────────────────────────────────────────────────────────────────
  const oCFs: { i: number; dir: 1 | -1 }[] = [];
  for (let i = 0; i < Math.min(OPENING_WINDOW, n); i++) {
    if (cs[i].isCF) {
      // PATCH ESTRUTURAL #1 — CF após `f` na abertura = contexto inválido
      // (main.js:245)
      if (i > 0 && cs[i - 1].isF) continue;
      oCFs.push({ i, dir: cs[i].cfbull ? 1 : -1 });
    }
  }
  if (oCFs.length >= 2) {
    const d1 = oCFs[0].dir;
    const d2 = oCFs[1].dir;
    if (d1 === d2) {
      // Same dir: valid only if OPPOSITE to pfd
      if (pfd !== 0 && d1 === pfd) {
        skip[oCFs[0].i] = true;
        skip[oCFs[1].i] = true;
      }
    } else {
      // Opposite: both invalid, 3rd CF resets context
      skip[oCFs[0].i] = true;
      skip[oCFs[1].i] = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // C1 — CF na barra 0, continuidade imediata, sem pfd check
  // Port literal de main.js:261-273.
  // ─────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────
  // SCAN GERAL
  // Port literal de main.js:276-315.
  // ─────────────────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const c = cs[i];
    if (!c.isCF || skip[i]) continue;
    const bar = i + 1;
    const dir: 1 | -1 = c.cfbull ? 1 : -1;
    if (bar > BAR40_LIMIT) continue; // bar 40 filter
    if (bar >= 4 && c.cnt > 0) continue; // pausa
    if (i === 0) continue; // C1 handled above

    // PATCH ESTRUTURAL #2 — CF após `f` no scan geral = contexto inválido
    // (main.js:284)
    if (i > 0 && cs[i - 1].isF) continue;

    // VWAP filter on CF
    if (
      c.vw > VWAP_VALID_MIN &&
      !((dir === 1 && c.cl > c.vw) || (dir === -1 && c.cl < c.vw))
    )
      continue;
    // 50% filter on CF
    if (
      c.fbmid > 0 &&
      !((dir === 1 && c.cl > c.fbmid) || (dir === -1 && c.cl < c.fbmid))
    )
      continue;

    // Scan for first valid continuation (first continuidade only)
    let entIdx = -1;
    for (let j = i + 1; j < n; j++) {
      const nc = cs[j];
      const nd: 1 | -1 = nc.bull ? 1 : -1;
      if (nc.isF) {
        entIdx = -1;
        break;
      } // f kills setup
      if (nc.isCF) {
        // Same-dir CF = substitution (outer loop will pick up as new CF)
        // Opposite CF = kills setup
        entIdx = -1;
        break;
      }
      if (nd === dir) {
        // Same-dir non-CF: entry candidate
        if (j >= BAR40_LIMIT) {
          entIdx = -1;
          break;
        } // bar 40 on entry
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
      // Opposite-dir non-CF: pullback, continue (CF stays active per dossier)
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
