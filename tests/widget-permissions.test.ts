import { describe, expect, it } from "vitest";
import {
  createWidgetResourceResult,
  RESOURCE_URI,
  WIDGET_CONTENT_META,
} from "../shared/mcp-app.js";

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

  it("uses the r6 resource URI so hosts fetch the polished recovery UI", () => {
    expect(RESOURCE_URI).toBe("ui://widget/compact-code-viewer-v1-r6.html");
    const result = createWidgetResourceResult("<html></html>");
    expect(result.contents[0]?.uri).toBe(RESOURCE_URI);
  });
});
