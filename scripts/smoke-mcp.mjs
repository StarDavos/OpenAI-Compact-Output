import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.MCP_URL ?? "http://127.0.0.1:8787/mcp");
const client = new Client({ name: "compact-code-viewer-smoke", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(endpoint);
const widgetResourceUri = "ui://widget/compact-code-viewer-v1-r2.html";

function makeFixture(lines, width = 72) {
  return Array.from({ length: lines }, (_, index) => {
    const n = String(index + 1).padStart(4, "0");
    return `line_${n} = \"${n}: $variable <tag>& unicode-🚀\"`.padEnd(width, "x");
  }).join("\n");
}

async function assertRenderCode(lines) {
  const code = makeFixture(lines);
  const result = await client.callTool({
    name: "render_code",
    arguments: {
      filename: `fixtures/smoke-${lines}.py`,
      language: "python",
      code,
    },
  });

  const metadata = result.structuredContent;
  assert(metadata && typeof metadata === "object", `render_code returned no metadata for ${lines} lines`);
  assert.equal(metadata.lineCount, lines);
  assert.equal(metadata.characterCount, code.length);
  assert.equal(metadata.complete, true);
  assert(!JSON.stringify(metadata).includes(code.slice(0, 120)), "structured metadata leaked/duplicated source code");

  console.log(`render_code PASS: ${lines} lines, ${code.length} chars`);
}

try {
  await client.connect(transport);

  const tools = await client.listTools();
  assert(tools.tools.some((tool) => tool.name === "render_code"), "render_code tool was not listed");

  for (const lines of [10, 100, 700, 1500]) {
    await assertRenderCode(lines);
  }

  const resources = await client.listResources();
  const widget = resources.resources.find((resource) => resource.uri === widgetResourceUri);
  assert(widget, `Compact Code Viewer UI resource ${widgetResourceUri} was not listed`);

  const resource = await client.readResource({ uri: widget.uri });
  const html = resource.contents.find((entry) => "text" in entry)?.text;
  assert.equal(typeof html, "string", "Widget resource did not return HTML text");
  assert(html.includes('id="root"'), "Widget HTML is missing the React root");
  assert(html.length > 10_000, "Widget HTML looks unexpectedly small/incomplete");

  console.log(`MCP smoke PASS: 10/100/700/1500-line matrix, widget ${html.length} chars`);
} finally {
  await client.close();
}
