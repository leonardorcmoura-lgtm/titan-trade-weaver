/**
 * GOLDEN TESTS — paridade comportamental do TITAN core.
 *
 * Esta suíte é o "freeze" oficial do engine. Qualquer mudança que
 * altere um único output canônico para qualquer cenário deste arquivo
 * é considerada BEHAVIORAL DRIFT e está proibida pelo PARITY.md.
 *
 * Para legitimar uma mudança: ver PARITY.md §8 (procedimento de mudança).
 */

import { describe, it } from "vitest";
import { GOLDEN_CASES } from "./scenarios";
import { replay } from "./replayRunner";
import { assertParity } from "./parityAssertions";

describe("TITAN core — golden parity", () => {
  for (const c of GOLDEN_CASES) {
    it(`${c.id} — ${c.description}`, () => {
      const result = replay(c);
      assertParity(result, c.expected, c.id);
    });
  }
});
