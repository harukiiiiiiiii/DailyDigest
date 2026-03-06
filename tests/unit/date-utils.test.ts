import { describe, it, expect } from "vitest";
import { formatDate, formatWeekday, addDays, getTodayString } from "../../src/lib/date-utils";

describe("formatDate", () => {
  it("formats YYYY-MM-DD to 月日 format", () => {
    expect(formatDate("2026-03-06")).toBe("3月6日");
    expect(formatDate("2026-01-15")).toBe("1月15日");
    expect(formatDate("2026-12-31")).toBe("12月31日");
  });
});

describe("formatWeekday", () => {
  it("returns correct Chinese weekday", () => {
    expect(formatWeekday("2026-03-06")).toBe("周五");
    expect(formatWeekday("2026-03-01")).toBe("周日");
    expect(formatWeekday("2026-03-02")).toBe("周一");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-03-06", 1)).toBe("2026-03-07");
    expect(addDays("2026-03-06", 7)).toBe("2026-03-13");
  });

  it("subtracts days with negative value", () => {
    expect(addDays("2026-03-06", -1)).toBe("2026-03-05");
    expect(addDays("2026-03-06", -6)).toBe("2026-02-28");
  });

  it("handles month/year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("returns same date when adding 0", () => {
    expect(addDays("2026-03-06", 0)).toBe("2026-03-06");
  });
});

describe("getTodayString", () => {
  it("returns YYYY-MM-DD format", () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
