import { describe, expect, it } from "vitest";
import { writeExactText, type ClipboardWriter } from "../web/clipboard.js";

describe("writeExactText", () => {
  it("writes the exact source once without normalization", async () => {
    const writes: string[] = [];
    const clipboard: ClipboardWriter = {
      async writeText(text) {
        writes.push(text);
      },
    };
    const source = "line 1\nline 2\twith tab\nUnicode: café 日本語 🚀\n";

    await expect(writeExactText(source, clipboard)).resolves.toEqual({ ok: true });
    expect(writes).toEqual([source]);
  });

  it("reports an unavailable clipboard instead of using a legacy fallback", async () => {
    await expect(writeExactText("exact", undefined)).resolves.toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("reports a rejected host clipboard write with the sanitized error name", async () => {
    const clipboard: ClipboardWriter = {
      async writeText() {
        const error = new Error("host denied clipboard access");
        error.name = "NotAllowedError";
        throw error;
      },
    };

    await expect(writeExactText("exact", clipboard)).resolves.toEqual({
      ok: false,
      reason: "rejected",
      errorName: "NotAllowedError",
    });
  });
});
