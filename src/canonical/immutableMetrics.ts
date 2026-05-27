/**
 * IMMUTABLE METRICS — ÚNICA API que a UI pode consumir para números reais.
 *
 * Não recalcula nada. Apenas serve `canonical_metrics.json` validado.
 * Qualquer chart/widget que precise de um número OBS/CALC deve obter aqui.
 *
 * Se a UI precisar de uma métrica que não existe ainda:
 *   1) adicionar derivação em scripts/derive-canonical.ts
 *   2) re-rodar o pipeline
 *   3) consumir aqui — JAMAIS calcular no componente.
 */

import { loadCanonical } from "./loader";
import type { CanonicalMetric } from "./types";

let cache: ReadonlyMap<string, CanonicalMetric> | null = null;

function ensure(): ReadonlyMap<string, CanonicalMetric> {
  if (cache) return cache;
  const { metrics } = loadCanonical();
  cache = new Map(metrics.metrics.map((m) => [m.id, m]));
  return cache;
}

export function getMetric(id: string): CanonicalMetric {
  const m = ensure().get(id);
  if (!m) {
    throw new Error(
      `[immutableMetrics] unknown metric "${id}". Add it to scripts/derive-canonical.ts and re-run the pipeline.`,
    );
  }
  return m;
}

export function listMetrics(): readonly CanonicalMetric[] {
  return Array.from(ensure().values());
}

/** Test-only. Não usar em produção. */
export function __resetMetricsCache(): void {
  cache = null;
}
