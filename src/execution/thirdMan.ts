/**
 * TERCEIRO HOMEM V5.2 — EXECUTION LAYER (additive-only).
 *
 * Port literal de "TITAN SYSTEM — MÓDULO INTEGRADO: O TERCEIRO HOMEM V5.2"
 * (NTSL). Implementa:
 *   • Detector CF próprio (ATR(20) * 1.4, mínimo 250, corpo ≥ 50% amp)
 *   • Candle Favorável simples (f) — fecha na direção sem ser CF
 *   • Máquina de estados: herança D-1 → captura C1/C2 → execução C3+
 *   • Gatilhos: CF+CF, CF+f, f+CF
 *
 * NÃO altera CoreTradeResult, setups oficiais ou reconciliação. É um
 * sinal paralelo emitido como telemetria. Pure function, deterministic.
 *
 * NOTA: A "Auto Fibo Dinâmica" do script NTSL (Nivel50, FixoMax/Min,
 * flip por 2 fechamentos) governa apenas o vHeranca do dia seguinte
 * (DirecaoAtual no script). Como aqui recebemos `prevDirection` já
 * resolvida do dia anterior, não precisamos reimplementar a Fibo —
 * ela seria computada offline e persistida via prevDirection.
 */

import type { Candle } from "@/core/types";

// ─────────────────────────────────────────────────────────────────────
// Parâmetros do método (NTSL — Terceiro Homem V5.2)
// ─────────────────────────────────────────────────────────────────────
const ATR_PERIOD = 20;
const CF_ATR_MULT = 1.4;
const CF_MIN_LIMIT = 250;
const CF_BODY_RATIO = 0.5;

export type ThirdManDirection = 1 | -1 | 0;

export interface ThirdManCandleFlags {
  bar: number;
  isCF_buy: boolean;
  isCF_sell: boolean;
  isF_buy: boolean;
  isF_sell: boolean;
}

export interface ThirdManTrigger {
  direction: 1 | -1;
  /** Bar index (0-based) onde C2 confirmou o gatilho. */
  triggerBar: number;
  /** Combinação que disparou o gatilho. */
  combo: "CF+CF" | "CF+f" | "f+CF";
  /** Reference level inicial (vRefMax para LONG, vRefMin para SHORT). */
  initialRef: number;
}

export interface ThirdManExecution {
  /** Bar (0-based) onde Close rompeu o ref → execução pintada. */
  executionBar: number;
  direction: 1 | -1;
  /** Ref final no momento da execução. */
  refAtExecution: number;
  closeAtExecution: number;
}

export interface ThirdManResult {
  inheritance: ThirdManDirection;
  c1: ThirdManCandleFlags | null;
  c2: ThirdManCandleFlags | null;
  trigger: ThirdManTrigger | null;
  /** null se gatilho cancelado por CF oposto antes da execução. */
  execution: ThirdManExecution | null;
  /** true se gatilho foi cancelado por CF oposto (vTH_Estado := 0). */
  cancelled: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers — True Range + ATR simples (igual Media(20, TrueRange) NTSL)
// ─────────────────────────────────────────────────────────────────────
function trueRange(curr: Candle, prev: Candle | null): number {
  const hl = curr.h - curr.l;
  if (!prev) return hl;
  const hc = Math.abs(curr.h - prev.cl);
  const lc = Math.abs(curr.l - prev.cl);
  return Math.max(hl, hc, lc);
}

function atrAt(candles: Candle[], idx: number, period: number): number {
  const start = Math.max(0, idx - period + 1);
  let sum = 0;
  let cnt = 0;
  for (let k = start; k <= idx; k++) {
    sum += trueRange(candles[k], k > 0 ? candles[k - 1] : null);
    cnt++;
  }
  return cnt ? sum / cnt : 0;
}

function classifyCandle(
  candles: Candle[],
  idx: number,
): ThirdManCandleFlags {
  const c = candles[idx];
  const open = c.o;
  const close = c.cl;
  const atr = atrAt(candles, idx, ATR_PERIOD);
  const calc = atr * CF_ATR_MULT;
  const limit = calc < CF_MIN_LIMIT ? CF_MIN_LIMIT : calc;
  const amp = c.h - c.l;
  const body = Math.abs(close - open);

  const isCF_buy =
    amp >= limit && body >= amp * CF_BODY_RATIO && close > open;
  const isCF_sell =
    amp >= limit && body >= amp * CF_BODY_RATIO && close < open;

  return {
    bar: idx,
    isCF_buy,
    isCF_sell,
    // f = fechou na direção mas NÃO é CF
    isF_buy: close > open && !isCF_buy,
    isF_sell: close < open && !isCF_sell,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Análise principal
// ─────────────────────────────────────────────────────────────────────
export function analyzeThirdMan(
  candles: Candle[],
  prevDirection: ThirdManDirection,
): ThirdManResult {
  const result: ThirdManResult = {
    inheritance: prevDirection,
    c1: null,
    c2: null,
    trigger: null,
    execution: null,
    cancelled: false,
  };

  if (candles.length < 2) return result;

  // C1 (BarraDia = 1) → idx 0
  result.c1 = classifyCandle(candles, 0);
  // C2 (BarraDia = 2) → idx 1
  result.c2 = classifyCandle(candles, 1);

  const { c1, c2 } = result;

  // Avalia gatilho na fronteira de C2
  let combo: ThirdManTrigger["combo"] | null = null;
  let dir: 1 | -1 | null = null;

  if (prevDirection === -1) {
    if (c1.isCF_buy && c2.isCF_buy) combo = "CF+CF";
    else if (c1.isCF_buy && c2.isF_buy) combo = "CF+f";
    else if (c1.isF_buy && c2.isCF_buy) combo = "f+CF";
    if (combo) dir = 1;
  } else if (prevDirection === 1) {
    if (c1.isCF_sell && c2.isCF_sell) combo = "CF+CF";
    else if (c1.isCF_sell && c2.isF_sell) combo = "CF+f";
    else if (c1.isF_sell && c2.isCF_sell) combo = "f+CF";
    if (combo) dir = -1;
  }

  if (!combo || !dir) return result;

  const c1Candle = candles[0];
  const c2Candle = candles[1];
  const initialRef =
    dir === 1
      ? Math.max(c1Candle.h, c2Candle.h)
      : Math.min(c1Candle.l, c2Candle.l);

  result.trigger = {
    direction: dir,
    triggerBar: 1,
    combo,
    initialRef,
  };

  // Estado de espera + execução (BarraDia >= 3 → idx >= 2)
  let ref = initialRef;
  for (let i = 2; i < candles.length; i++) {
    const cur = candles[i];
    const flags = classifyCandle(candles, i);

    if (dir === 1) {
      if (cur.cl > ref) {
        result.execution = {
          executionBar: i,
          direction: 1,
          refAtExecution: ref,
          closeAtExecution: cur.cl,
        };
        return result;
      }
      if (flags.isCF_sell) {
        result.cancelled = true;
        return result;
      }
      if (cur.h > ref) ref = cur.h;
    } else {
      if (cur.cl < ref) {
        result.execution = {
          executionBar: i,
          direction: -1,
          refAtExecution: ref,
          closeAtExecution: cur.cl,
        };
        return result;
      }
      if (flags.isCF_buy) {
        result.cancelled = true;
        return result;
      }
      if (cur.l < ref) ref = cur.l;
    }
  }

  return result;
}
