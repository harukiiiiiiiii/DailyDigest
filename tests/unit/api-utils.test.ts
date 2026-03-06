import { describe, it, expect } from "vitest";
import { joinUrl, openaiUrl } from "../../src/lib/api-utils";

describe("joinUrl", () => {
  it("joins base and path cleanly", () => {
    expect(joinUrl("https://api.example.com", "v1/models")).toBe("https://api.example.com/v1/models");
  });

  it("strips trailing/leading slashes", () => {
    expect(joinUrl("https://api.example.com/", "/v1/models")).toBe("https://api.example.com/v1/models");
    expect(joinUrl("https://api.example.com///", "///path")).toBe("https://api.example.com/path");
  });

  it("handles base without trailing slash", () => {
    expect(joinUrl("https://api.example.com", "path")).toBe("https://api.example.com/path");
  });
});

describe("openaiUrl", () => {
  it("appends /v1/chat/completions when no version in base", () => {
    expect(openaiUrl("https://api.deepseek.com")).toBe("https://api.deepseek.com/v1/chat/completions");
  });

  it("appends /chat/completions when version already present", () => {
    expect(openaiUrl("https://api.x.ai/v1")).toBe("https://api.x.ai/v1/chat/completions");
  });

  it("strips trailing slashes before appending", () => {
    expect(openaiUrl("https://api.deepseek.com/")).toBe("https://api.deepseek.com/v1/chat/completions");
    expect(openaiUrl("https://api.x.ai/v1/")).toBe("https://api.x.ai/v1/chat/completions");
  });
});
