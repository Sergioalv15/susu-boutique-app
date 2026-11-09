import { describe, expect, it } from "vitest";
import {
  createInitialMonthParamConsumeState,
  decideMonthParamApplication,
} from "./monthParam";

describe("decideMonthParamApplication", () => {
  it("does not apply when no month param is present", () => {
    const decision = decideMonthParamApplication(
      createInitialMonthParamConsumeState(),
      undefined,
    );

    expect(decision.apply).toBe(false);
    expect(decision.target).toBeNull();
    expect(decision.next.consumed).toBe(false);
  });

  it("applies a valid year-month once and marks it consumed", () => {
    const decision = decideMonthParamApplication(
      createInitialMonthParamConsumeState(),
      "2026-02",
    );

    expect(decision.apply).toBe(true);
    expect(decision.target?.getFullYear()).toBe(2026);
    expect(decision.target?.getMonth()).toBe(1);
    expect(decision.next.consumed).toBe(true);
  });

  it("does not re-apply a lingering param on the next focus (consume)", () => {
    const first = decideMonthParamApplication(
      createInitialMonthParamConsumeState(),
      "2026-02",
    );
    const repeated = decideMonthParamApplication(first.next, "2026-02");

    expect(first.apply).toBe(true);
    expect(repeated.apply).toBe(false);
  });

  it("re-applies the same month for a fresh request after the param is cleared (repeat)", () => {
    const first = decideMonthParamApplication(
      createInitialMonthParamConsumeState(),
      "2026-02",
    );
    const cleared = decideMonthParamApplication(first.next, undefined);
    const fresh = decideMonthParamApplication(cleared.next, "2026-02");

    expect(first.apply).toBe(true);
    expect(cleared.next.consumed).toBe(false);
    expect(fresh.apply).toBe(true);
    expect(fresh.target?.getMonth()).toBe(1);
  });

  it("rejects malformed year-month params without applying", () => {
    const decision = decideMonthParamApplication(
      createInitialMonthParamConsumeState(),
      "2026-13",
    );

    expect(decision.apply).toBe(false);
    expect(decision.target).toBeNull();
  });
});