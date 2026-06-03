/**
 * PREV DAY LEVELS — EXECUTION LAYER (additive-only).
 *
 * Port do indicador NTSL "A_F_M_M_A_V": expõe os 6 níveis de referência
 * do dia anterior (Abertura, Máxima, Mínima, Fechamento, Ajuste, VWAP)
 * como dados estruturados para consumo de barrier check (core) e
 * overlays visuais (UI).
 *
 * NÃO altera reconciliação financeira ou structuralState. Quando
 * `prev.vwap` está definido, barrier.ts passa a considerá-lo como
 * barreira candidata (additive — sem vwap o comportamento é idêntico
 * ao port original).
 */

import type { PrevDay } from "@/core/types";

export type PrevDayLevelKind =
  | "abertura"
  | "maxima"
  | "minima"
  | "fechamento"
  | "ajuste"
  | "vwap";

export interface PrevDayLevel {
  kind: PrevDayLevelKind;
  value: number;
  /** Cor canônica do indicador NTSL (referência visual). */
  color: string;
  label: string;
}

const COLORS: Record<PrevDayLevelKind, string> = {
  abertura: "#3B82F6",    // clBlue
  maxima: "#F97316",      // clOrange
  minima: "#F97316",      // clOrange
  fechamento: "#3B82F6",  // clBlue
  ajuste: "#D946EF",      // clFuchsia
  vwap: "#FFFFFF",        // clWhite
};

const LABELS: Record<PrevDayLevelKind, string> = {
  abertura: "Abertura D-1",
  maxima: "Máxima D-1",
  minima: "Mínima D-1",
  fechamento: "Fechamento D-1",
  ajuste: "Ajuste D-1",
  vwap: "VWAP D-1",
};

export function getPrevDayLevels(prev: PrevDay | null): PrevDayLevel[] {
  if (!prev) return [];
  const out: PrevDayLevel[] = [];
  const push = (kind: PrevDayLevelKind, value: number | undefined) => {
    if (value && value > 0) {
      out.push({ kind, value, color: COLORS[kind], label: LABELS[kind] });
    }
  };
  push("abertura", prev.abertura);
  push("maxima", prev.maximo);
  push("minima", prev.minimo);
  push("fechamento", prev.fechamento);
  push("ajuste", prev.ajuste);
  push("vwap", prev.vwap);
  return out;
}
