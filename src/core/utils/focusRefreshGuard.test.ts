import { describe, expect, it } from "vitest";
import { createFocusRefreshGuard } from "./focusRefreshGuard";

describe("createFocusRefreshGuard", () => {
  it("returns false on first focus and true on the next focus", () => {
    const shouldRefreshOnFocus = createFocusRefreshGuard();

    expect(shouldRefreshOnFocus()).toBe(false);
    expect(shouldRefreshOnFocus()).toBe(true);
  });

  it("stays true after the second focus", () => {
    const shouldRefreshOnFocus = createFocusRefreshGuard();

    void shouldRefreshOnFocus();

    expect(shouldRefreshOnFocus()).toBe(true);
    expect(shouldRefreshOnFocus()).toBe(true);
    expect(shouldRefreshOnFocus()).toBe(true);
  });

  it("enables focus refresh when returning from day save/edit", () => {
    const shouldRefreshOnFocus = createFocusRefreshGuard();

    expect(shouldRefreshOnFocus()).toBe(false);

    expect(shouldRefreshOnFocus()).toBe(true);
  });
});