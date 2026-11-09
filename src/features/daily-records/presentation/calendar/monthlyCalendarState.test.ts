import { describe, expect, it } from "vitest";
import { toIsoDate } from "../../../../core/utils/date";
import {
  createInitialMonthlyCalendarState,
  monthlyCalendarReducer,
} from "./monthlyCalendarState";

describe("monthlyCalendarReducer", () => {
  it("starts from month first day", () => {
    const today = new Date(2026, 7, 20);
    const initial = createInitialMonthlyCalendarState(today);

    expect(initial.visibleMonth.getFullYear()).toBe(2026);
    expect(initial.visibleMonth.getMonth()).toBe(7);
    expect(initial.visibleMonth.getDate()).toBe(1);
    expect(initial.todayIso).toBe("2026-08-20");
    expect(initial.selectedDateIso).toBe("2026-08-20");
  });

  it("moves December to January", () => {
    const state = createInitialMonthlyCalendarState(new Date(2026, 11, 20));
    const next = monthlyCalendarReducer(state, { type: "nextMonth" });

    expect(next.visibleMonth.getFullYear()).toBe(2027);
    expect(next.visibleMonth.getMonth()).toBe(0);
    expect(next.selectedDateIso).toBeNull();
  });

  it("moves January to previous December", () => {
    const state = createInitialMonthlyCalendarState(new Date(2026, 0, 20));
    const previous = monthlyCalendarReducer(state, { type: "previousMonth" });

    expect(previous.visibleMonth.getFullYear()).toBe(2025);
    expect(previous.visibleMonth.getMonth()).toBe(11);
    expect(previous.selectedDateIso).toBeNull();
  });

  it("shows the month containing a selected date", () => {
    const state = createInitialMonthlyCalendarState(new Date(2026, 0, 20));
    const selected = monthlyCalendarReducer(state, {
      type: "showMonth",
      date: new Date(2027, 6, 19),
    });

    expect(selected.visibleMonth).toEqual(new Date(2027, 6, 1));
    expect(selected.selectedDateIso).toBeNull();
  });

  it("restores today as selected when navigating back to current month", () => {
    const today = new Date(2026, 7, 20);
    const initial = createInitialMonthlyCalendarState(today);
    const nextMonth = monthlyCalendarReducer(initial, { type: "nextMonth" });
    const backToTodayMonth = monthlyCalendarReducer(nextMonth, { type: "previousMonth" });

    expect(backToTodayMonth.visibleMonth).toEqual(new Date(2026, 7, 1));
    expect(backToTodayMonth.selectedDateIso).toBe(toIsoDate(today));
  });

  it("selects today when showMonth targets current month", () => {
    const today = new Date(2026, 7, 20);
    const initial = createInitialMonthlyCalendarState(today);
    const otherMonth = monthlyCalendarReducer(initial, { type: "nextMonth" });
    const shownToday = monthlyCalendarReducer(otherMonth, {
      type: "showMonth",
      date: new Date(2026, 7, 2),
    });

    expect(shownToday.visibleMonth).toEqual(new Date(2026, 7, 1));
    expect(shownToday.selectedDateIso).toBe("2026-08-20");
  });

  it("updates selected day explicitly when user taps a day", () => {
    const state = createInitialMonthlyCalendarState(new Date(2026, 7, 20));
    const next = monthlyCalendarReducer(state, {
      type: "selectDate",
      iso: "2026-08-03",
    });

    expect(next.visibleMonth).toEqual(new Date(2026, 7, 1));
    expect(next.selectedDateIso).toBe("2026-08-03");
  });
});
