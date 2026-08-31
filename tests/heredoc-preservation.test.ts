import { describe, expect, it } from "vitest";
import { getCodeMetadata, isCompletePayload } from "../shared/code.js";
import { RENDER_CODE_TOOL_METADATA } from "../shared/mcp-app.js";
import { renderCodeInputSchema } from "../server/render-code.js";

describe("shell-wrapped copy payloads", () => {
  it("preserves the opening command, inner source, and closing heredoc delimiter exactly", () => {
    const payload = [
      "cat <<'EOF' > scripts/test_commercial_research.py",
      "from pathlib import Path",
      "import sqlite3",
      "",
      "ROOT = Path(__file__).resolve().parent.parent",
      "print(\"commercial research\")",
      "EOF",
    ].join("\n");

    const parsed = renderCodeInputSchema.parse({
      filename: "terminal-test-commercial-research.sh",
      language: "bash",
      code: payload,
    });
    const metadata = getCodeMetadata(parsed);

    expect(parsed.code).toBe(payload);
    expect(parsed.code.startsWith("cat <<'EOF' > scripts/test_commercial_research.py\n")).toBe(true);
    expect(parsed.code.endsWith("\nEOF")).toBe(true);
    expect(metadata.lineCount).toBe(7);
    expect(metadata.characterCount).toBe(payload.length);
    expect(isCompletePayload(parsed.code, metadata)).toBe(true);
  });

  it("tells the model to keep the complete outer shell wrapper atomic", () => {
    expect(RENDER_CODE_TOOL_METADATA.description).toContain("one atomic copy unit");
    expect(RENDER_CODE_TOOL_METADATA.description).toContain("MUST stay together");
    expect(RENDER_CODE_TOOL_METADATA.description).toContain("never split that wrapper");
  });
});
