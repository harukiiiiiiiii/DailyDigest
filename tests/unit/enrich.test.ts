import { describe, it, expect } from "vitest";
import { titleSimilarity, deduplicateItems } from "../../pipeline/enrich";
import type { RawSearchItem } from "../../pipeline/types";

function makeItem(overrides: Partial<RawSearchItem> = {}): RawSearchItem {
  return {
    title: "Test Article",
    summary: "A test summary",
    source: "test.com",
    url: "https://test.com/article",
    relevance: "high",
    ...overrides,
  };
}

describe("titleSimilarity", () => {
  it("returns 1 for identical titles", () => {
    expect(titleSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 1 for case-insensitive match", () => {
    expect(titleSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("returns 0 for completely different titles", () => {
    const sim = titleSimilarity("abcde", "fghij");
    expect(sim).toBe(0);
  });

  it("returns high similarity for near-duplicate titles", () => {
    const sim = titleSimilarity(
      "OpenAI Releases GPT-5 Model",
      "OpenAI Releases GPT-5",
    );
    expect(sim).toBeGreaterThan(0.6);
  });

  it("returns low similarity for different topics", () => {
    const sim = titleSimilarity(
      "Tesla Stock Drops 10%",
      "Apple Launches New iPhone",
    );
    expect(sim).toBeLessThan(0.3);
  });

  it("handles empty strings", () => {
    expect(titleSimilarity("", "")).toBe(0);
    expect(titleSimilarity("hello", "")).toBe(0);
    expect(titleSimilarity("", "hello")).toBe(0);
  });

  it("handles single-char strings (no bigrams)", () => {
    expect(titleSimilarity("a", "a")).toBe(0);
  });
});

describe("deduplicateItems", () => {
  it("keeps unique items", () => {
    const items = [
      makeItem({ title: "Tesla Stock Drops 10% After Earnings Report" }),
      makeItem({ title: "NASA Launches New Mars Exploration Rover Successfully" }),
      makeItem({ title: "Apple Announces iPhone 18 With Revolutionary Battery" }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(3);
  });

  it("removes near-duplicate titles", () => {
    const items = [
      makeItem({ title: "OpenAI Releases GPT-5 Model Today" }),
      makeItem({ title: "OpenAI Releases GPT-5 Model" }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
  });

  it("prefers item with valid URL when deduplicating", () => {
    const items = [
      makeItem({ title: "Breaking News About AI", _urlValid: false, summary: "short" }),
      makeItem({ title: "Breaking News About AI Today", _urlValid: true, summary: "longer summary here" }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
    expect(result[0]._urlValid).toBe(true);
  });

  it("prefers item with longer summary when both have same URL validity", () => {
    const items = [
      makeItem({ title: "Same News Title Here", _urlValid: true, summary: "short" }),
      makeItem({ title: "Same News Title Here Today", _urlValid: true, summary: "this is a much longer and more detailed summary" }),
    ];
    const result = deduplicateItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toContain("much longer");
  });

  it("handles empty array", () => {
    expect(deduplicateItems([])).toHaveLength(0);
  });

  it("handles single item", () => {
    const result = deduplicateItems([makeItem()]);
    expect(result).toHaveLength(1);
  });
});
