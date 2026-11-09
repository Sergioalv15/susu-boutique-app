import { describe, expect, it } from "vitest";
import {
  createRootStackScreenOptions,
  rootStackScreenOptions,
} from "./rootStackScreenOptions";
import { resolveTheme, Theme } from "../../ui/theme";

describe("rootStackScreenOptions", () => {
  it("hides Expo Router automatic headers globally", () => {
    expect(rootStackScreenOptions.headerShown).toBe(false);
  });

  it("keeps existing header theme values for explicit opt-in screens", () => {
    expect(rootStackScreenOptions.headerStyle).toEqual({
      backgroundColor: Theme.colors.surface,
    });
    expect(rootStackScreenOptions.headerTintColor).toBe(Theme.colors.text);
    expect(rootStackScreenOptions.headerShadowVisible).toBe(false);
    expect(rootStackScreenOptions.headerTitleStyle).toEqual({
      fontWeight: "700",
    });
  });

  it("maps dark-mode stack colors from resolved theme", () => {
    const darkTheme = resolveTheme("dark");
    const darkOptions = createRootStackScreenOptions(darkTheme);

    expect(darkOptions.headerStyle).toEqual({
      backgroundColor: darkTheme.colors.surface,
    });
    expect(darkOptions.contentStyle).toEqual({
      backgroundColor: darkTheme.colors.background,
    });
    expect(darkOptions.headerTintColor).toBe(darkTheme.colors.text);
  });
});
