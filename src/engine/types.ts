/**
 * TITAN — Tipos do engine (TS strict)
 *
 * Reflete exatamente a forma dos dados pós-decode + os contratos das
 * 3 camadas (execution / structural / financial).
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
// Candle decodificado (saída do intrabar/decode.ts — Fase 2).
// Campos batem 1:1 com decode() de engine/main.js linhas 113-123.
// ─────────────────────────────────────────────────────────────────────
export interface Candle {
  /** Hora HH:MM */
  t: string;
  o: number;
  h: number;
  l: number;
  cl: number;
  /** VWAP (0 ou >50000) */
  vw: number;
  /** Continuidade Forte */
  isCF: boolean;
  /** Falha */
  isF: boolean;
  /** CF bullish */
  cfbull: boolean;
  /** CF bearish */
  cfbear: boolean;
  /** Fibo max (0 se ausente) */
  fbmax: number;
  /** Fibo min (0 se ausente) */
  fbmin: number;
  /** Fibo 50% (0 se ausente) */
  fbmid: number;
  /** Direção fibo: 1=up, -1=down, 0=neutro */
  fbdir: -1 | 0 | 1;
  /** Pausa exaustão: 0..5 */
  cnt: number;
  /** Amplitude */
  amp: number;
  /** % do corpo */
  bodyPct: number;
  /** ATR limit */
  lim: number;
  /** Candle bullish (close >= open) */
  bull: boolean;
  /** Posição 1-based no dia (preenchido por decode) */
  bar: number;
}

// ─────────────────────────────────────────────────────────────────────
// Referências do dia anterior (PrevDay).
// ─────────────────────────────────────────────────────────────────────
export interface PrevDay {
  maximo: number;
  minimo: number;
  fechamento: number;
  abertura: number;
  ajuste: number;
}

// ─────────────────────────────────────────────────────────────────────
// Dados de um dia já decodificados, prontos para o engine.
// ─────────────────────────────────────────────────────────────────────
export interface DayData {
  candles: Candle[];
  /** PrevFibo dominance: 1=up, -1=down, 0=neutro */
  pfd: -1 | 0 | 1;
  /** Abertura do dia */
  aber: number;
  /** Referências do dia anterior */
  prev: PrevDay | null;
}

// ─────────────────────────────────────────────────────────────────────
// Setup detectado por getSetups().
// ─────────────────────────────────────────────────────────────────────
export type SetupType = "C1" | "open" | "norm";

export interface Setup {
  /** Index do CF na sequência de candles */
  cfIdx: number;
  /** Index da barra de entrada (continuidade) */
  entIdx: number;
  /** Direção: 1=LONG, -1=SHORT */
  dir: 1 | -1;
  /** Tipo do setup */
  type: SetupType;
  /** Preço de entrada */
  ep: number;
  /** Distância até a barreira mais próxima do dia anterior */
  barrierDist: number;
  /** Barreira está livre (≥175pts)? */
  barrierOk: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Confirmação de quadrado (N/1 fechado).
// ─────────────────────────────────────────────────────────────────────
export interface QuadConfirmation {
  /** Nível N (1..N) */
  q: number;
  /** Index da barra em que fechou */
  bar: number;
  /** Hora HH:MM do fechamento */
  t: string;
  /** Close deslocamento absoluto em pontos (snapshot do evento) */
  cd?: number;
}

// ─────────────────────────────────────────────────────────────────────
// Evento operacional (Execution Layer).
// NÃO é estado estrutural — é o "log" do que aconteceu.
// ─────────────────────────────────────────────────────────────────────
export type ExecutionEventType =
  | "P1"
  | "P2"
  | "N1"
  | "N2"
  | "N3"
  | "N4"
  | "N5"
  | "N6"
  | "N7"
  | "N8"
  | "N9"
  | "N10"
  | "RUNNER_STOP"
  | "STOP_RAW";

export interface ExecutionEvent {
  type: ExecutionEventType;
  bar: number;
  pts: number;
  label: string;
}

// ─────────────────────────────────────────────────────────────────────
// Resultado completo de simulateTrade — 3 camadas separadas.
// ─────────────────────────────────────────────────────────────────────
export interface TradeResult {
  // ── Setup original ───────────────────────────────────────────────
  setup: Setup;

  // ── Execution layer (operacional, dados crus) ────────────────────
  ep: number;
  dir: 1 | -1;
  stop0: number;
  /** Index da barra em que P1 foi tocado (-1 se nunca) */
  p1Hit: number;
  /** Hora HH:MM do toque de P1 */
  p1Time: string;
  /** Index da barra em que P2 (+350pts toque) foi atingido (-1 se nunca) */
  p2Hit: number;
  /** Nível N confirmado por fechamento (0 = nenhum, P1 sem quad = 0/0) */
  quadLevel: number;
  quadConfirmed: QuadConfirmation[];
  runStop: number;
  exitBar: number;
  exitPrice: number;
  /** Snapshot dos QUADS usados (port literal) */
  QUADS: ReadonlyArray<readonly [number, number]>;
  executionEvents: ExecutionEvent[];

  // ── Structural layer (reconciliado) ──────────────────────────────
  structuralState: StructuralState;
  allowT2: boolean;

  // ── Financial layer (derivado do structural) ─────────────────────
  financialResult: number;
}

// ─────────────────────────────────────────────────────────────────────
// Resultado do day engine: t1 obrigatório, t2 só se allowT2.
// ─────────────────────────────────────────────────────────────────────
export interface DayEngineResult {
  t1: TradeResult | null;
  t2: TradeResult | null;
}

// ─────────────────────────────────────────────────────────────────────
// Estado parcial usado pelo reconciliador (apenas o que importa).
// Permite ser chamado durante a simulação sem ter TradeResult completo.
// ─────────────────────────────────────────────────────────────────────
export interface ReconcilableTrade {
  p1Hit: number;
  quadLevel: number;
}
