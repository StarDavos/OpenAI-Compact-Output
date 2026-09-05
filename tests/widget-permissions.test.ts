import { describe, expect, it } from "vitest";
import { createWidgetResourceResult, WIDGET_CONTENT_META } from "../shared/mcp-app.js";

describe("widget sandbox permissions", () => {
  it("requests only clipboard write access", () => {
    expect(WIDGET_CONTENT_META.ui.permissions).toEqual({
      clipboardWrite: {},
    });
  });

  it("ships clipboard write permission on the UI resource response", () => {
    const result = createWidgetResourceResult("<html></html>");
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]?._meta.ui.permissions).toEqual({
      clipboardWrite: {},
    });
  });
});
