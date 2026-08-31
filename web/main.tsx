import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  useApp,
  useDocumentTheme,
  useHostStyles,
} from "@modelcontextprotocol/ext-apps/react";
import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { CopyButton } from "@openai/apps-sdk-ui/components/Button";
import { CodeBlockBase } from "@openai/apps-sdk-ui/components/CodeBlock";
import "@openai/apps-sdk-ui/css";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import batch from "react-syntax-highlighter/dist/esm/languages/prism/batch";
import {
  countLines,
  getLanguageInfo,
  isCompletePayload,
  resolveFilename,
  type CodeMetadata,
  type CodeViewerInput,
} from "../shared/code";
import "./viewer.css";

SyntaxHighlighter.registerLanguage("powershell", powershell);
SyntaxHighlighter.registerLanguage("batch", batch);

type Phase = "waiting" | "streaming" | "awaiting-result" | "complete";
type DisplayMode = "inline" | "pip" | "fullscreen";

type ChatGptHost = {
  toolInput?: unknown;
  displayMode?: DisplayMode;
  requestDisplayMode?: (options: { mode: DisplayMode }) => Promise<unknown>;
};

function getChatGptHost(): ChatGptHost | undefined {
  return (window as Window & { openai?: ChatGptHost }).openai;
}

function asInput(value: unknown): Partial<CodeViewerInput> | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  return {
    filename: typeof input.filename === "string" ? input.filename : undefined,
    language: typeof input.language === "string" ? input.language : undefined,
    code: typeof input.code === "string" ? input.code : undefined,
  } as Partial<CodeViewerInput>;
}

function asMetadata(value: unknown): (CodeMetadata & { complete?: boolean }) | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.lineCount !== "number" || typeof data.characterCount !== "number") return null;

  return {
    filename: typeof data.filename === "string" ? data.filename : "Untitled Plain text Document",
    language: typeof data.language === "string" ? data.language : "Plain text",
    lineCount: data.lineCount,
    characterCount: data.characterCount,
    complete: data.complete === true,
  };
}

function CompactCodeViewer() {
  const initialHostInput = typeof window !== "undefined" ? asInput(getChatGptHost()?.toolInput) : null;
  const [input, setInput] = useState<Partial<CodeViewerInput> | null>(initialHostInput);
  const [metadata, setMetadata] = useState<(CodeMetadata & { complete?: boolean }) | null>(null);
  const [phase, setPhase] = useState<Phase>(initialHostInput?.code ? "awaiting-result" : "waiting");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(getChatGptHost()?.displayMode ?? "inline");
  const [fallbackExpanded, setFallbackExpanded] = useState(false);
  const [displayModeError, setDisplayModeError] = useState<string | null>(null);

  const { app, error } = useApp({
    appInfo: { name: "Compact Code Viewer", version: "0.1.0" },
    capabilities: {},
    onAppCreated: (createdApp: McpApp) => {
      createdApp.ontoolinputpartial = (params) => {
        setInput(asInput(params.arguments));
        setPhase("streaming");
      };
      createdApp.ontoolinput = (params) => {
        setInput(asInput(params.arguments));
        setPhase("awaiting-result");
      };
      createdApp.ontoolresult = (result) => {
        setMetadata(asMetadata(result.structuredContent));
        setPhase("complete");
      };
      createdApp.onhostcontextchanged = (context) => {
        if (context.displayMode === "inline" || context.displayMode === "pip" || context.displayMode === "fullscreen") {
          setDisplayMode(context.displayMode);
        }
      };
    },
  });

  useHostStyles(app, app?.getHostContext());
  const theme = useDocumentTheme();

  const code = typeof input?.code === "string" ? input.code : "";
  const languageInfo = useMemo(() => getLanguageInfo(input?.language ?? metadata?.language), [input?.language, metadata?.language]);
  const filename = resolveFilename(input?.filename ?? metadata?.filename, input?.language ?? metadata?.language);
  const localLineCount = countLines(code);
  const complete = phase === "complete" && metadata?.complete === true && isCompletePayload(code, metadata);
  const payloadMismatch = phase === "complete" && metadata?.complete === true && code.length > 0 && !complete;
  const shownLineCount = metadata?.lineCount ?? localLineCount;
  const shownCharacterCount = metadata?.characterCount ?? code.length;
  const fullscreen = displayMode === "fullscreen";

  async function toggleFullView() {
    setDisplayModeError(null);
    const target: DisplayMode = fullscreen ? "inline" : "fullscreen";
    const host = getChatGptHost();

    try {
      if (host?.requestDisplayMode) {
        await host.requestDisplayMode({ mode: target });
        setDisplayMode(host.displayMode ?? target);
        return;
      }

      if (app?.requestDisplayMode) {
        await app.requestDisplayMode({ mode: target });
        setDisplayMode(target);
        return;
      }

      setFallbackExpanded((value) => !value);
    } catch (requestError) {
      setDisplayModeError(requestError instanceof Error ? requestError.message : "Full View is unavailable in this host.");
    }
  }

  if (error) {
    return <div className="statusCard errorCard">Compact Code Viewer could not connect to the host: {error.message}</div>;
  }

  if (!app && !initialHostInput) {
    return <div className="statusCard">Connecting Compact Code Viewer...</div>;
  }

  if (phase === "waiting") {
    return <div className="statusCard">Waiting for code...</div>;
  }

  if (phase === "complete" && !code) {
    return <div className="statusCard errorCard">No code was supplied. Copy is unavailable.</div>;
  }

  return (
    <main className={`viewer ${fullscreen ? "fullscreen" : ""} ${fallbackExpanded ? "fallbackExpanded" : ""}`} data-theme={theme}>
      <header className="viewerHeader">
        <div className="titleGroup">
          <div className="filename" title={filename}>{filename}</div>
          <div className="metadataLine">
            <span>{languageInfo.label}</span>
            <span aria-hidden="true">·</span>
            <span>{shownLineCount.toLocaleString()} {shownLineCount === 1 ? "line" : "lines"}</span>
            <span aria-hidden="true">·</span>
            <span>{shownCharacterCount.toLocaleString()} chars</span>
            {phase === "streaming" && <span className="phaseBadge">Receiving...</span>}
          </div>
        </div>
        <CopyButton
          copyValue={() => code}
          disabled={!complete}
          variant="ghost"
          color="secondary"
          size="sm"
          aria-label={complete ? "Copy complete code" : "Copy disabled until complete code is verified"}
        >
          {({ copied }) => copied ? "Copied" : "Copy"}
        </CopyButton>
      </header>

      {payloadMismatch && (
        <div className="integrityError" role="alert">
          Incomplete payload detected. Copy is disabled because the received code does not match the server's final line/character counts.
        </div>
      )}

      <section className="codeViewport" aria-label={`Complete ${languageInfo.label} code`}>
        <CodeBlockBase className="codeBlock">
          <CodeBlockBase.Code language={languageInfo.syntax}>{code || "Receiving code..."}</CodeBlockBase.Code>
        </CodeBlockBase>
      </section>

      <footer className="viewerFooter">
        <button type="button" className="fullViewButton" onClick={toggleFullView} aria-label={fullscreen ? "Return to compact view" : "Open code in full view"}>
          <span aria-hidden="true">{fullscreen ? "↙" : "↗"}</span>
          {fullscreen ? "Return to Compact" : fallbackExpanded ? "Collapse" : "Open Full View"}
        </button>
        {!complete && !payloadMismatch && (
          <span className="copyStatus">Copy unlocks after the complete payload is verified.</span>
        )}
      </footer>

      {displayModeError && <div className="displayModeError" role="status">{displayModeError}</div>}
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");
createRoot(rootElement).render(<CompactCodeViewer />);
