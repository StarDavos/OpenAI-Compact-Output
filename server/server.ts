import {
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRenderCodeResult,
  MAX_MCP_REQUEST_BYTES,
  parseRenderCodeInput,
  renderCodeInputSchema,
} from "../shared/render-code.js";
import {
  createWidgetResourceResult,
  RENDER_CODE_TOOL_METADATA,
  RENDER_CODE_TOOL_NAME,
  RESOURCE_URI,
  SERVER_NAME,
  SERVER_VERSION,
  WIDGET_RESOURCE_METADATA,
} from "../shared/mcp-app.js";
import { getCodeMetadata } from "../shared/code.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const WIDGET_HTML_PATH = path.join(ROOT_DIR, "web", "dist", "widget.html");

function readWidgetHtml(): string {
  if (!fs.existsSync(WIDGET_HTML_PATH)) {
    throw new Error("Widget build output is missing. Run npm run build:web first.");
  }

  return fs.readFileSync(WIDGET_HTML_PATH, "utf8");
}

function applySecurityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  next();
}

export function createCompactCodeServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerAppTool(
    server,
    RENDER_CODE_TOOL_NAME,
    {
      ...RENDER_CODE_TOOL_METADATA,
      inputSchema: renderCodeInputSchema,
    },
    async (input) => {
      const parsed = parseRenderCodeInput(input);
      const metadata = getCodeMetadata(parsed);
      console.info(`[render_code] characters=${metadata.characterCount} lines=${metadata.lineCount}`);
      return buildRenderCodeResult(parsed);
    },
  );

  registerAppResource(
    server,
    "Compact Code Viewer",
    RESOURCE_URI,
    WIDGET_RESOURCE_METADATA,
    async () => createWidgetResourceResult(readWidgetHtml()),
  );

  return server;
}

export function createHttpApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: MAX_MCP_REQUEST_BYTES, strict: true }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: SERVER_NAME, version: SERVER_VERSION });
  });

  app.all("/mcp", async (req, res) => {
    const server = createCompactCodeServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const errorType = error instanceof Error ? error.name : "UnknownError";
      console.error(`MCP request failed (${errorType})`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const details = error as { status?: unknown; type?: unknown };
    const status = typeof details.status === "number" ? details.status : 500;
    const type = typeof details.type === "string" ? details.type : "UnknownError";

    if (status === 413 || type === "entity.too.large") {
      console.error("HTTP request rejected (payload_too_large)");
      res.status(413).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Request body exceeds the supported 1 MiB limit." },
        id: null,
      });
      return;
    }

    if (status === 400 || type === "entity.parse.failed") {
      console.error("HTTP request rejected (invalid_json)");
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Invalid JSON request body." },
        id: null,
      });
      return;
    }

    console.error(`HTTP request failed (${type})`);
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  });

  return app;
}

function getListenPort(): number {
  const rawPort = process.env.PORT ?? "8787";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${JSON.stringify(rawPort)}`);
  }

  return port;
}

if (process.env.NODE_ENV !== "test") {
  const host = process.env.HOST?.trim() || "127.0.0.1";
  const port = getListenPort();
  const httpServer = createHttpApp().listen(port, host, () => {
    console.log(`Compact Code Viewer listening on http://${host}:${port}/mcp`);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Compact Code Viewer received ${signal}; shutting down.`);

    const forceExit = setTimeout(() => process.exit(1), 5_000);
    forceExit.unref();

    httpServer.close((error) => {
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
