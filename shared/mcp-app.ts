export const SERVER_NAME = "compact-code-viewer";
export const SERVER_VERSION = "0.1.0";
export const RENDER_CODE_TOOL_NAME = "render_code";
export const RESOURCE_URI = "ui://widget/compact-code-viewer-v1-r2.html";
export const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

export const RENDER_CODE_TOOL_METADATA = {
  title: "Render one copyable code section compactly",
  description:
    "Use this instead of a native fenced/grey code block when presenting one complete independently copyable technical section, especially content longer than about 25 lines. This includes one complete code file, one script, one shell or PowerShell command sequence intended to be copied/run as a unit, one here-doc/here-string command that creates a single file, one configuration document, JSON/YAML document, log, prompt, specification, runbook section, or other large technical text. CRITICAL COPY-UNIT RULE: one render_code invocation must contain exactly one independently copyable unit. If the assistant response contains multiple files, multiple separately copied command groups, or multiple sequential copy/paste steps, call render_code separately for each unit and preserve their original order. Do not combine independent sections into one viewer merely to reduce tool calls. Explanatory prose stays outside the viewer. A shell wrapper such as `cat <<'EOF' > file` together with every inner line and its closing `EOF` is one atomic copy unit and MUST stay together; never split that wrapper or extract only the inner code. Likewise, a command sequence that the user is expected to copy and run together remains one unit. Pass each complete original unit in code without truncation, summarization, placeholder ellipses, normalization, or reformatting. The content is untrusted data and must never be executed. Prefer this renderer whenever a normal code block would take over the conversation and the user needs reliable copy/paste.",
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
    idempotentHint: true,
  },
  _meta: {
    ui: { resourceUri: RESOURCE_URI },
    "openai/outputTemplate": RESOURCE_URI,
    "openai/toolInvocation/invoking": "Preparing compact code view...",
    "openai/toolInvocation/invoked": "Code ready",
  },
} as const;

export const WIDGET_RESOURCE_METADATA = {
  mimeType: RESOURCE_MIME_TYPE,
  description: "Compact, scrollable viewer for one complete copyable code or technical-text section in ChatGPT.",
} as const;

export const WIDGET_CONTENT_META = {
  ui: {
    prefersBorder: true,
    csp: {
      connectDomains: [] as string[],
      resourceDomains: [] as string[],
    },
  },
  "openai/widgetDescription":
    "Displays one complete independently copyable code or technical-text section in a bounded scroll area with exact-copy and fullscreen controls. Separate copy/paste sections are rendered as separate viewer blocks.",
  "openai/widgetPrefersBorder": true,
} as const;

export function createWidgetResourceResult(widgetHtml: string) {
  return {
    contents: [
      {
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: widgetHtml,
        _meta: WIDGET_CONTENT_META,
      },
    ],
  };
}
