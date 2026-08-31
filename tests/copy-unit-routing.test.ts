import { describe, expect, it } from "vitest";
import { RENDER_CODE_TOOL_METADATA } from "../shared/mcp-app.js";

describe("render_code copy-unit routing contract", () => {
  it("requires independent copy/paste sections to use separate tool calls", () => {
    const description = RENDER_CODE_TOOL_METADATA.description;

    expect(description).toContain("one independently copyable unit");
    expect(description).toContain("call render_code separately for each unit");
    expect(description).toContain("Do not combine independent sections");
  });

  it("keeps a single heredoc wrapper atomic", () => {
    const description = RENDER_CODE_TOOL_METADATA.description;

    expect(description).toContain("one atomic copy unit");
    expect(description).toContain("MUST stay together");
    expect(description).toContain("never split that wrapper");
  });
});
