import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  countLines,
  getCodeMetadata,
  getLanguageInfo,
  isCompletePayload,
  resolveFilename,
} from "../shared/code.js";
import { buildRenderCodeResult, renderCodeInputSchema } from "../server/render-code.js";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function makeFixture(lines: number, targetCharsPerLine = 48, newline = "\n"): string {
  return Array.from({ length: lines }, (_, index) => {
    const number = String(index + 1).padStart(4, "0");
    const prefix = `line_${number} = \"${number}: $variable <tag>& backtick-marker\"`;
    return prefix.padEnd(targetCharsPerLine, "x");
  }).join(newline);
}

describe("line counting", () => {
  it("counts LF, CRLF, and CR without normalizing content", () => {
    expect(countLines("a\nb\nc")).toBe(3);
    expect(countLines("a\r\nb\r\nc\r\n")).toBe(3);
    expect(countLines("a\rb\rc")).toBe(3);
    expect(countLines("")).toBe(0);
  });
});

describe("language and filename labels", () => {
  it("maps supported language aliases and falls back safely", () => {
    expect(getLanguageInfo("ps1")).toMatchObject({ label: "PowerShell", syntax: "powershell" });
    expect(getLanguageInfo("cmd")).toMatchObject({ label: "Windows Batch / CMD", syntax: "batch" });
    expect(getLanguageInfo("html")).toMatchObject({ label: "HTML", syntax: "markup" });
    expect(getLanguageInfo("made-up-lang")).toMatchObject({ label: "made-up-lang" });
    expect(getLanguageInfo("made-up-lang").syntax).toBeUndefined();
  });

  it("creates a useful generic filename", () => {
    expect(resolveFilename(undefined, "python")).toBe("Untitled Python Script");
    expect(resolveFilename(" scripts/migrate_db.py ", "python")).toBe("scripts/migrate_db.py");
  });
});

describe("full-copy integrity contract", () => {
  for (const lines of [10, 100, 700, 1500]) {
    it(`preserves all content for a ${lines}-line fixture`, () => {
      const code = makeFixture(lines, lines >= 700 ? 64 : 48);
      const parsed = renderCodeInputSchema.parse({ filename: "fixture.py", language: "python", code });
      const metadata = getCodeMetadata(parsed);
      const result = buildRenderCodeResult(parsed);

      expect(metadata.lineCount).toBe(lines);
      expect(metadata.characterCount).toBe(code.length);
      expect(isCompletePayload(parsed.code, metadata)).toBe(true);
      expect(sha256(parsed.code)).toBe(sha256(code));
      expect(JSON.stringify(result.structuredContent)).not.toContain(code.slice(0, 200));
    });
  }

  it("preserves representative V1 languages without changing source text", () => {
    const samples = [
      ["powershell", "$items | ForEach-Object { Write-Output \"$_ & <tag>\" }"],
      ["python", "def f(x):\n\treturn f\"{x} <tag> & \\\\ path\""],
      ["json", "{\"name\":\"viewer\",\"enabled\":true,\"chars\":\"<&>\"}"],
      ["bash", "printf '%s\\n' \"$HOME\" '<tag>&'"],
      ["typescript", "const value: string = `${name} <tag>&`;"],
      ["text", "plain text <tag> & $variable `backtick`"],
    ] as const;

    for (const [language, code] of samples) {
      const parsed = renderCodeInputSchema.parse({ language, code });
      const metadata = getCodeMetadata(parsed);
      expect(parsed.code).toBe(code);
      expect(sha256(parsed.code)).toBe(sha256(code));
      expect(isCompletePayload(parsed.code, metadata)).toBe(true);
    }
  });

  it("preserves special characters, Unicode, tabs, blank lines, CRLF, and LF exactly", () => {
    const code = [
      "# Unicode: café 日本語 🚀",
      "`backticks` \"double\" 'single' $variable ${value}",
      "<html data-x=\"a&b\">& text</html>",
      "\tindented\twith\ttabs",
      "",
      "{\"json\": true, \"path\": \"C:\\\\Temp\\\\file.txt\"}",
      "line with CRLF",
    ].join("\r\n") + "\nfinal LF line";

    const parsed = renderCodeInputSchema.parse({ language: "powershell", code });
    const metadata = getCodeMetadata(parsed);

    expect(parsed.code).toBe(code);
    expect(sha256(parsed.code)).toBe(sha256(code));
    expect(isCompletePayload(parsed.code, metadata)).toBe(true);
    expect(parsed.code.includes("🚀")).toBe(true);
  });

  it("preserves a very long line without wrapping or truncating the source value", () => {
    const code = `const payload = \"${"x".repeat(20_000)}\";`;
    const parsed = renderCodeInputSchema.parse({ language: "typescript", code });
    const metadata = getCodeMetadata(parsed);

    expect(metadata.lineCount).toBe(1);
    expect(parsed.code.length).toBe(code.length);
    expect(sha256(parsed.code)).toBe(sha256(code));
    expect(isCompletePayload(parsed.code, metadata)).toBe(true);
  });

  it("preserves a 70k+ payload that remains within the documented application limit", () => {
    const code = makeFixture(1500, 72);
    expect(code.length).toBeGreaterThan(70_000);

    const parsed = renderCodeInputSchema.parse({ language: "text", code });
    expect(parsed.code.length).toBe(code.length);
    expect(sha256(parsed.code)).toBe(sha256(code));
  });

  it("detects an incomplete payload and would keep Copy locked", () => {
    const code = makeFixture(700, 64);
    const metadata = getCodeMetadata({ code, language: "python" });
    const truncated = code.slice(0, -17);

    expect(isCompletePayload(truncated, metadata)).toBe(false);
  });
});
