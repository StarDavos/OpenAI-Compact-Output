import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import widgetHtml from "../web/dist/widget.html";
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

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

type ParsedBodyResult =
  | { ok: true; parsedBody: unknown }
  | { ok: false; response: Response };

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

type WorkerVersionMetadata = {
  id?: string;
  tag?: string;
  timestamp?: string;
};

type WorkerEnv = {
  MCP_RATE_LIMITER?: RateLimiter;
  CF_VERSION_METADATA?: WorkerVersionMetadata;
};

type AccessIdentity = {
  email?: string;
};

type WorkerExecutionContext = {
  access?: {
    getIdentity(): Promise<AccessIdentity | null>;
  };
};

function safeJson(status: number, body: unknown): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function readWorkerVersionMetadata(env: WorkerEnv) {
  const metadata = env.CF_VERSION_METADATA;
  if (!metadata?.id) return null;

  return {
    id: metadata.id,
    tag: metadata.tag ?? null,
    timestamp: metadata.timestamp ?? null,
  };
}

async function parseJsonBodyWithinLimit(request: Request): Promise<ParsedBodyResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return {
      ok: false,
      response: safeJson(415, {
        jsonrpc: "2.0",
        error: { code: -32600, message: "MCP POST requests require application/json." },
        id: null,
      }),
    };
  }

  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const declaredLength = Number(rawLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return {
        ok: false,
        response: safeJson(400, {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Content-Length." },
          id: null,
        }),
      };
    }
    if (declaredLength > MAX_MCP_REQUEST_BYTES) {
      return {
        ok: false,
        response: safeJson(413, {
          jsonrpc: "2.0",
          error: { code: -32001, message: "Request body exceeds the supported 1 MiB limit." },
          id: null,
        }),
      };
    }
  }

  if (!request.body) {
    return {
      ok: false,
      response: safeJson(400, {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Request body is required." },
        id: null,
      }),
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_MCP_REQUEST_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          response: safeJson(413, {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Request body exceeds the supported 1 MiB limit." },
            id: null,
          }),
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      response: safeJson(400, {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Unable to read request body." },
        id: null,
      }),
    };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, parsedBody: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: safeJson(400, {
        jsonrpc: "2.0",
        error: { code: -32700, message: "Invalid JSON request body." },
        id: null,
      }),
    };
  }
}

async function hashIdentityForRateLimit(identity: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceProductionAccess(
  env: WorkerEnv,
  ctx: WorkerExecutionContext,
): Promise<Response | null> {
  // Local workerd tests intentionally omit the production rate-limit binding.
  // Production config always includes it, making this branch fail closed if Access context is missing.
  if (!env.MCP_RATE_LIMITER) return null;

  if (!ctx.access) {
    return safeJson(403, { error: "Cloudflare Access authentication required." });
  }

  let identity: AccessIdentity | null;
  try {
    identity = await ctx.access.getIdentity();
  } catch {
    return safeJson(403, { error: "Cloudflare Access identity unavailable." });
  }

  const email = identity?.email?.trim().toLowerCase();
  if (!email) {
    return safeJson(403, { error: "Authenticated Cloudflare Access identity required." });
  }

  // Do not send the raw email address to the rate-limit binding as its key.
  const identityHash = await hashIdentityForRateLimit(email);
  const { success } = await env.MCP_RATE_LIMITER.limit({ key: `access-sha256:${identityHash}` });
  if (!success) {
    return safeJson(429, {
      jsonrpc: "2.0",
      error: { code: -32002, message: "Rate limit exceeded. Try again shortly." },
      id: null,
    });
  }

  return null;
}

export function createWorkerMcpServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    RENDER_CODE_TOOL_NAME,
    {
      ...RENDER_CODE_TOOL_METADATA,
      inputSchema: renderCodeInputSchema,
    },
    async (input) => buildRenderCodeResult(parseRenderCodeInput(input)),
  );

  server.registerResource(
    "Compact Code Viewer",
    RESOURCE_URI,
    WIDGET_RESOURCE_METADATA,
    async () => createWidgetResourceResult(widgetHtml),
  );

  return server;
}

const mcpHandler = createMcpHandler(createWorkerMcpServer, {
  route: "/mcp",
  corsOptions: false,
  responseMode: "json",
});

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/mcp" && url.pathname !== "/healthz") {
      return safeJson(404, { error: "Not found" });
    }

    // In production, both the MCP endpoint and health endpoint require a valid Access identity.
    // Cloudflare Access remains the primary edge control; this is an application-level backstop.
    const accessFailure = await enforceProductionAccess(env, ctx);
    if (accessFailure) return accessFailure;

    if (url.pathname === "/healthz") {
      if (request.method !== "GET") return safeJson(405, { error: "Method not allowed" });
      return safeJson(200, {
        ok: true,
        service: SERVER_NAME,
        version: SERVER_VERSION,
        runtime: "cloudflare-worker",
        workerVersion: readWorkerVersionMetadata(env),
      });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBodyWithinLimit(request);
      if (!parsed.ok) return parsed.response;
      return withSecurityHeaders(await mcpHandler.fetch(request, { parsedBody: parsed.parsedBody }));
    }

    return withSecurityHeaders(await mcpHandler.fetch(request));
  },
};