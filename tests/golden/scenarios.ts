/**
 * GOLDEN SCENARIOS — Casos canônicos de paridade do TITAN core.
 *
 * Cada caso define:
 *   • candles  — sequência sintética (OHLC mínimos)
 *   • setup    — setup já validado (bypass de getSetups)
 *   • expected — outputs canônicos obrigatórios (parity-locked)
 *
 * Drift em qualquer campo expected → teste falha. Sem exceções.
 */

import type { Candle, Setup, StructuralState } from "@/core/types";
import { longSetup, mk, shortSetup } from "./fixtures";

export interface GoldenExpected {
  structuralState: StructuralState;
  financialResult: number;
  allowT2: boolean;
  p1Hit: number;
  quadLevel: number;
  exitBar: number;
  exitPrice: number;
  quadConfirmedCount: number;
}

export interface GoldenCase {
  id: string;
  description: string;
  candles: Candle[];
  setup: Setup;
  expected: GoldenExpected;
}

const EP = 100000;

// Entry sempre na barra 0 (setup.entIdx=0). Simulação começa na barra 1.

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: "CASE_001_STOP_NO_P1",
    description: "Stop hit antes de P1 → STOP / -350 / allowT2 false",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: low cruza stop0 (EP-350)
      mk(EP, EP + 50, EP - 400, EP - 200, "09:01"),
    ],
    expected: {
      structuralState: "STOP",
      financialResult: -350,
      allowT2: false,
      p1Hit: -1,
      quadLevel: 0,
      exitBar: 1,
      exitPrice: EP - 350,
      quadConfirmedCount: 0,
    },
  },

  {
    id: "CASE_002_P1_ONLY",
    description: "P1 toca, depois runner stop em BE+50 → '0/0' / 135 / allowT2",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: toque +175 (ativa P1, runStop = EP+50), close abaixo de +700
      mk(EP, EP + 200, EP + 30, EP + 100, "09:01"),
      // bar 2: low atinge runStop EP+50
      mk(EP + 100, EP + 120, EP + 50, EP + 60, "09:02"),
    ],
    expected: {
      structuralState: "0/0",
      financialResult: 135,
      allowT2: true,
      p1Hit: 1,
      quadLevel: 0,
      exitBar: 2,
      exitPrice: EP + 50,
      quadConfirmedCount: 0,
    },
  },

  {
    id: "CASE_003_P1_PLUS_N1",
    description: "P1 + close +700pts → N1 / '1/1' / 315 / allowT2 false",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: high toca P1 e close em +700 → N1 confirma. runStop=EP+350.
      mk(EP, EP + 750, EP - 20, EP + 700, "09:01"),
      // bar 2: low atinge novo runStop EP+350
      mk(EP + 700, EP + 720, EP + 300, EP + 350, "09:02"),
    ],
    expected: {
      structuralState: "1/1",
      financialResult: 315,
      allowT2: false,
      p1Hit: 1,
      quadLevel: 1,
      exitBar: 2,
      exitPrice: EP + 350,
      quadConfirmedCount: 1,
    },
  },

  {
    id: "CASE_004_MULTI_JUMP_N2",
    description:
      "Close direto +1050pts → N1 e N2 confirmados juntos, '2/1' / 525",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: high P1, close +1050 → q=2 (preenche q=1 e q=2). runStop=EP+700.
      mk(EP, EP + 1100, EP - 5, EP + 1050, "09:01"),
      // bar 2: low atinge runStop EP+700
      mk(EP + 1050, EP + 1080, EP + 650, EP + 700, "09:02"),
    ],
    expected: {
      structuralState: "2/1",
      financialResult: 525,
      allowT2: false,
      p1Hit: 1,
      quadLevel: 2,
      exitBar: 2,
      exitPrice: EP + 700,
      quadConfirmedCount: 2,
    },
  },

  {
    id: "CASE_005_STOP_BEATS_P1_SAME_BAR",
    description:
      "Mesma vela toca stop (wick) E tocaria P1 (wick) — STOP vence pela precedência",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: low EP-400 (≤ stop0) E high EP+200 (≥ P1). STOP check é #1.
      mk(EP, EP + 200, EP - 400, EP - 100, "09:01"),
    ],
    expected: {
      structuralState: "STOP",
      financialResult: -350,
      allowT2: false,
      p1Hit: -1,
      quadLevel: 0,
      exitBar: 1,
      exitPrice: EP - 350,
      quadConfirmedCount: 0,
    },
  },

  {
    id: "CASE_006_P1_AND_QUAD_SAME_BAR",
    description:
      "Mesma vela: P1 toque (wick) + close +700 → N1 confirma na mesma iteração",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: high+P1, close +700. Order: STOP (no) → P1 activate → QUAD q=1.
      mk(EP, EP + 700, EP + 50, EP + 700, "09:01"),
      // bar 2: low EP+350 → atinge novo runStop
      mk(EP + 700, EP + 720, EP + 350, EP + 400, "09:02"),
    ],
    expected: {
      structuralState: "1/1",
      financialResult: 315,
      allowT2: false,
      p1Hit: 1,
      quadLevel: 1,
      exitBar: 2,
      exitPrice: EP + 350,
      quadConfirmedCount: 1,
    },
  },

  {
    id: "CASE_007_SHORT_P1_ONLY",
    description: "SHORT: P1 toca por baixo, runner stop em BE+50 (abaixo do ep para short = ep-50)",
    setup: shortSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1 short: low EP-200 → touchD=200 ≥175 ativa P1; runStop = EP-50
      mk(EP, EP - 30, EP - 200, EP - 100, "09:01"),
      // bar 2: high atinge runStop EP-50 (h ≥ runStop)
      mk(EP - 100, EP - 50, EP - 120, EP - 60, "09:02"),
    ],
    expected: {
      structuralState: "0/0",
      financialResult: 135,
      allowT2: true,
      p1Hit: 1,
      quadLevel: 0,
      exitBar: 2,
      exitPrice: EP - 50,
      quadConfirmedCount: 0,
    },
  },

  {
    id: "CASE_008_TRADE_OPEN_AT_EOD",
    description: "Trade não fecha até o fim do dia → exitBar=-1, exitPrice=stop0",
    setup: longSetup(EP, 0),
    candles: [
      mk(EP, EP + 10, EP - 10, EP, "09:00"),
      // bar 1: nada acontece (sem P1, sem stop)
      mk(EP, EP + 50, EP - 50, EP + 20, "09:01"),
    ],
    expected: {
      structuralState: "STOP",
      financialResult: -350,
      allowT2: false,
      p1Hit: -1,
      quadLevel: 0,
      exitBar: -1,
      exitPrice: EP - 350, // stop0 inicial
      quadConfirmedCount: 0,
    },
  },
];
