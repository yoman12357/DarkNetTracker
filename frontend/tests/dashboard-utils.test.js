import { describe, expect, it } from "vitest";

import { formatTimestamp } from "../lib/dashboard-utils";

describe("formatTimestamp", () => {
  it("returns fallback for empty values", () => {
    expect(formatTimestamp("")).toBe("N/A");
  });

  it("returns original value for invalid date strings", () => {
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });
});
