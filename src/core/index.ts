/**
 * TITAN CORE — barrel exports (parity-locked).
 *
 * REGRA: nenhum import deste barrel pode ter dependência de React,
 * window, fetch, fs, ou qualquer side-effect. CORE é deterministic-only.
 */

export * from "./constants";
export * from "./types";
export { checkBarrier, type BarrierResult } from "./barrier";
export {
  deriveAllowT2,
  deriveFinancialPayout,
  deriveStructuralState,
} from "./reconciliation";
export { getSetups } from "./setups";
export { simulateTrade } from "./simulate";
export { runDayEngine } from "./dayEngine";
