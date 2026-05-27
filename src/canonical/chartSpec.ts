/**
 * CHART SPEC — contrato obrigatório para qualquer gráfico do TITAN.
 *
 * Nenhum chart é renderizado sem ChartSpec completo. Os campos abaixo
 * NÃO são opcionais: faltando qualquer um, o renderer recusa.
 *
 * Isso elimina "gráficos soltos" — todo plot carrega:
 *   - como foi construído (formula)
 *   - fonte (source / metric ids)
 *   - granularidade
 *   - período
 *   - hipótese estatística (hypothesis)
 *   - interpretação institucional (interpretation)
 */

import type { EpistemicTag } from "@/audit/epistemic";
import type { Granularity, Period } from "@/audit/provenance";

export interface ChartExplain {
  /** Pseudo-código humano. */
  formula: string;
  /** IDs de métrica em immutableMetrics ou paths de dataset. */
  sources: string[];
  granularity: Granularity;
  period: Period;
  /** Hipótese estatística sendo ilustrada. */
  hypothesis: string;
  /** Como o leitor institucional deve interpretar. */
  interpretation: string;
  epistemic: EpistemicTag;
}

export interface ChartSpec {
  id: string;
  title: string;
  kind: "line" | "bar" | "scatter" | "hist" | "table";
  explain: ChartExplain;
  /** Referências a métricas canônicas. Renderer resolve via immutableMetrics. */
  metricRefs: string[];
}

export function assertChartSpec(spec: ChartSpec): void {
  const required: (keyof ChartExplain)[] = [
    "formula",
    "sources",
    "granularity",
    "period",
    "hypothesis",
    "interpretation",
    "epistemic",
  ];
  for (const k of required) {
    const v = spec.explain[k];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
      throw new Error(`[ChartSpec ${spec.id}] missing explain.${String(k)}`);
    }
  }
  if (spec.metricRefs.length === 0) {
    throw new Error(`[ChartSpec ${spec.id}] must reference at least one canonical metric`);
  }
}
