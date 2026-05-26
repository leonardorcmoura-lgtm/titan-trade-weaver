/**
 * TITAN CORE — Tipos canônicos (parity-locked).
 *
 * Define os outputs OFICIAIS do core. Qualquer alteração a esta forma é
 * considerada behavioral drift e exige atualização do PARITY.md + golden
 * tests. Campos additive-only (P2 tracking, execution events) vivem em
 * src/execution/types.ts e NÃO podem aparecer aqui.
 */

// ─────────────────────────────────────────────────────────────────────
// Estado estrutural reconciliado — único conjunto de valores válidos.
// Ordem dos N/1 espelha STATE_PAYOUT.
// ─────────────────────────────────────────────────────────────────────
export type StructuralState =
  | "STOP"
  | "0/0"
  | "1/1"
  | "2/1"
  | "3/1"
  | "4/1"
  | "5/1"
  | "6/1"
  | "7/1"
  | "8/1"
  | "9/1"
  | "10/1"
  | "11/1"
  | "12/1"
  | "13/1";

// ─────────────────────────────────────────────────────────────────────
// Candle decodificado (saída do intrabar/decode.ts).
// Campos batem 1:1 com decode() de engine/main.js.
// ─────────────────────────────────────────────────────────────────────
export interface Candle {
  t: string;
  o: number;
  h: number;
  l: number;
  cl: number;
  vw: number;
  isCF: boolean;
  isF: boolean;
  cfbull: boolean;
  cfbear: boolean;
  fbmax: number;
  fbmin: number;
  fbmid: number;
  fbdir: -1 | 0 | 1;
  cnt: number;
  amp: number;
  bodyPct: number;
  lim: number;
  bull: boolean;
  bar: number;
}

export interface PrevDay {
  maximo: number;
  minimo: number;
  fechamento: number;
  abertura: number;
  ajuste: number;
}

export interface DayData {
  candles: Candle[];
  pfd: -1 | 0 | 1;
  aber: number;
  prev: PrevDay | null;
}

export type SetupType = "C1" | "open" | "norm";

export interface Setup {
  cfIdx: number;
  entIdx: number;
  dir: 1 | -1;
  type: SetupType;
  ep: number;
  barrierDist: number;
  barrierOk: boolean;
}

export interface QuadConfirmation {
  q: number;
  bar: number;
  t: string;
  /** Snapshot do close delta no momento da confirmação. Metadata. */
  cd?: number;
}

// ─────────────────────────────────────────────────────────────────────
// CoreTradeResult — OUTPUT CANÔNICO do core (parity-locked).
//
// Campos canônicos abaixo são os outputs auditados pelos golden tests.
// Qualquer mudança em significado, ordem operacional ou valor para um
// mesmo input é drift comportamental proibido.
// ─────────────────────────────────────────────────────────────────────
export interface CoreTradeResult {
  setup: Setup;
  ep: number;
  dir: 1 | -1;
  stop0: number;
  /** -1 se nunca tocou; índice da barra do toque caso contrário. */
  p1Hit: number;
  p1Time: string;
  /** 0 = sem N fechado (inclui '0/0'); q ≥ 1 = nível confirmado. */
  quadLevel: number;
  quadConfirmed: QuadConfirmation[];
  runStop: number;
  /** -1 se trade ainda aberto ao fim do dia. */
  exitBar: number;
  exitPrice: number;
  /** Snapshot dos QUADS efetivamente usados. */
  QUADS: ReadonlyArray<readonly [number, number]>;
  // ── Camada estrutural (única autoridade) ─────────────────────────
  structuralState: StructuralState;
  allowT2: boolean;
  // ── Camada financeira (derivada do structural) ───────────────────
  financialResult: number;
}

export interface CoreDayEngineResult {
  t1: CoreTradeResult | null;
  t2: CoreTradeResult | null;
}

export interface ReconcilableTrade {
  p1Hit: number;
  quadLevel: number;
}
