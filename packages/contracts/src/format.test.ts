import { describe, expect, it } from "vitest";

import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it("formats whole rupiah using Indonesian conventions", () => {
    expect(formatCurrency(125000)).toBe("Rp 125.000");
  });

  it("rejects amounts that are not safe whole rupiah", () => {
    expect(() => formatCurrency(1.5)).toThrow(RangeError);
    expect(() => formatCurrency(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError,
    );
  });
});

describe("formatDate", () => {
  it("formats dates in Indonesian and Jakarta time", () => {
    expect(formatDate("2026-10-28T00:00:00.000Z", "Asia/Jakarta")).toBe(
      "28 Oktober 2026",
    );
  });

  it("rejects invalid date input", () => {
    expect(() => formatDate("invalid", "Asia/Jakarta")).toThrow(RangeError);
  });
});
