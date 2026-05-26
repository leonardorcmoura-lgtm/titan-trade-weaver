/**
 * PARITY ASSERTIONS — verifica os outputs canônicos definidos em PARITY.md
 * contra um GoldenExpected. Falha = behavioral drift no core.
 */

import { expect } from "vitest";
import type { CoreTradeResult } from "@/core/types";
import type { GoldenExpected } from "./scenarios";

export function assertParity(
  result: CoreTradeResult,
  expected: GoldenExpected,
  label: string,
): void {
  expect(result.structuralState, `${label}: structuralState`).toBe(
    expected.structuralState,
  );
  expect(result.financialResult, `${label}: financialResult`).toBe(
    expected.financialResult,
  );
  expect(result.allowT2, `${label}: allowT2`).toBe(expected.allowT2);
  expect(result.p1Hit, `${label}: p1Hit`).toBe(expected.p1Hit);
  expect(result.quadLevel, `${label}: quadLevel`).toBe(expected.quadLevel);
  expect(result.exitBar, `${label}: exitBar`).toBe(expected.exitBar);
  expect(result.exitPrice, `${label}: exitPrice`).toBe(expected.exitPrice);
  expect(
    result.quadConfirmed.length,
    `${label}: quadConfirmed.length`,
  ).toBe(expected.quadConfirmedCount);
}
