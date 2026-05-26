/**
 * TITAN CORE — Constantes do método (parity-locked).
 *
 * Port literal de engine/main.js (vanilla) e titan_reconciliation.py.
 * NÃO ALTERAR valores sem revisão estrutural e atualização do PARITY.md
 * + golden tests. Toda a matemática do método depende destes números.
 */

import type { StructuralState } from "./types";

// ─────────────────────────────────────────────────────────────────────
// QUADS — [gatilho_close_delta, novo_stop_delta]
// Index 0 = "0/0": P1 atingido, nenhum quadrado fechado, runner BE+50.
// Index q ≥ 1 = "N/1": gatilho de fechamento e novo stop.
// ─────────────────────────────────────────────────────────────────────
export const QUADS: ReadonlyArray<readonly [number, number]> = [
  [0, 50],
  [700, 350],
  [1050, 700],
  [1400, 1050],
  [1750, 1400],
  [2100, 1750],
  [2450, 2100],
  [2800, 2450],
  [3150, 2800],
  [3500, 3150],
  [3850, 3500],
] as const;

// ─────────────────────────────────────────────────────────────────────
// STATE_PAYOUT — pontos líquidos por estado estrutural reconciliado.
// Fonte: engine/main.js linhas 13-17.
// ─────────────────────────────────────────────────────────────────────
export const STATE_PAYOUT: Readonly<Record<StructuralState, number>> = {
  STOP: -350,
  "0/0": 135,
  "1/1": 315,
  "2/1": 525,
  "3/1": 735,
  "4/1": 945,
  "5/1": 1155,
  "6/1": 1365,
  "7/1": 1575,
  "8/1": 1785,
  "9/1": 1995,
  "10/1": 2205,
  "11/1": 2415,
  "12/1": 2625,
  "13/1": 2835,
};

// ─────────────────────────────────────────────────────────────────────
// Parâmetros operacionais (titan_reconciliation.py)
// ─────────────────────────────────────────────────────────────────────
export const TICK_VALUE = 0.2;
export const TICK_SIZE = 5.0;
export const STOP_PONTOS = -350;
export const P1_PONTOS = 175;
export const P1_STOP_BE = 50;
export const N_LEVEL = 350;

// Deltas operacionais usados pelo simulateTrade (espelham QUADS / regra-mãe).
export const STOP_DESLOC = 350;
export const P1_TOUCH = 175;
export const BE_PLUS = 50;

// ─────────────────────────────────────────────────────────────────────
// Mapeamentos visuais — consumidos apenas pela UI; CORE não depende.
// ─────────────────────────────────────────────────────────────────────
export const TCLASS: Readonly<Record<string, string>> = {
  Stop: "ts",
  P1: "tp1",
  "P1 + P2": "tp12",
  "0 / 0": "tn0",
  "1 / 1": "tn1",
  "2 / 1": "tn2",
  "3 / 1": "tn3",
  "4 / 1": "tn4",
  "5 / 1": "tn5",
  "6 / 1": "tn6",
  "7 / 1": "tn7",
  "8 / 1": "tn7",
  "10 / 1": "tn7",
  "13 / 1": "tn7",
  "Stop P1 + P2": "tsp",
  "Stop + P1": "tsp",
};

export const BMAP: Readonly<Record<string, number>> = {
  Stop: -350,
  P1: 75,
  "P1 + P2": 135,
  "0 / 0": 135,
  "1 / 1": 315,
  "2 / 1": 525,
  "3 / 1": 735,
  "4 / 1": 945,
  "5 / 1": 1155,
  "6 / 1": 1365,
  "7 / 1": 1575,
  "8 / 1": 1785,
  "10 / 1": 2205,
  "13 / 1": 2835,
  "Stop P1 + P2": 135,
  "Stop + P1": 50,
};

export const TEXP: Readonly<Record<string, string>> = {
  Stop: "Stop 350pts.",
  P1: "P1 +175. Stop →+50.",
  "P1 + P2": "P1+P2. N-1 fechou na entrada.",
  "0 / 0": "P1+P2. N-1=entry. +135.",
  "1 / 1": "+315.",
  "2 / 1": "+525.",
  "3 / 1": "+735.",
  "4 / 1": "+945.",
  "5 / 1": "+1155.",
  "6 / 1": "+1365.",
  "7 / 1": "+1575.",
  "8 / 1": "+1785.",
  "Stop P1 + P2": "P1+P2. Trail→stop. +135.",
  "Stop + P1": "P1. Trail→stop. +50.",
};
