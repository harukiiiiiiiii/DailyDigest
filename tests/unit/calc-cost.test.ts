import { describe, it, expect } from "vitest";
import { calcCost, type AgentApiConfig } from "../../pipeline/config";

const mockConfig: AgentApiConfig = {
  apiKey: "test",
  baseUrl: "https://example.com",
  model: "test-model",
  sdkType: "openai",
  maxTokens: 4096,
  inputPricePer1M: 1.0,
  outputPricePer1M: 2.0,
  timeoutMs: 60_000,
};

describe("calcCost", () => {
  it("calculates zero cost for zero tokens", () => {
    expect(calcCost({ inputTokens: 0, outputTokens: 0 }, mockConfig)).toBe(0);
  });

  it("calculates cost correctly for 1M tokens", () => {
    const cost = calcCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, mockConfig);
    expect(cost).toBeCloseTo(3.0); // 1.0 + 2.0
  });

  it("calculates cost correctly for partial tokens", () => {
    const cost = calcCost({ inputTokens: 500_000, outputTokens: 250_000 }, mockConfig);
    expect(cost).toBeCloseTo(1.0); // 0.5 + 0.5
  });

  it("handles input-only cost", () => {
    const cost = calcCost({ inputTokens: 100_000, outputTokens: 0 }, mockConfig);
    expect(cost).toBeCloseTo(0.1);
  });

  it("handles output-only cost", () => {
    const cost = calcCost({ inputTokens: 0, outputTokens: 100_000 }, mockConfig);
    expect(cost).toBeCloseTo(0.2);
  });
});
