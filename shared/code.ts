export type CodeViewerInput = {
  filename?: string;
  language?: string;
  code: string;
};

export type CodeMetadata = {
  filename: string;
  language: string;
  lineCount: number;
  characterCount: number;
};

type LanguageInfo = {
  label: string;
  syntax?: string;
  scriptNoun?: string;
};

const LANGUAGE_ALIASES: Record<string, LanguageInfo> = {
  powershell: { label: "PowerShell", syntax: "powershell", scriptNoun: "Script" },
  pwsh: { label: "PowerShell", syntax: "powershell", scriptNoun: "Script" },
  ps1: { label: "PowerShell", syntax: "powershell", scriptNoun: "Script" },
  python: { label: "Python", syntax: "python", scriptNoun: "Script" },
  py: { label: "Python", syntax: "python", scriptNoun: "Script" },
  bash: { label: "Bash", syntax: "bash", scriptNoun: "Script" },
  sh: { label: "Shell", syntax: "bash", scriptNoun: "Script" },
  shell: { label: "Shell", syntax: "bash", scriptNoun: "Script" },
  cmd: { label: "Windows Batch / CMD", syntax: "batch", scriptNoun: "Script" },
  batch: { label: "Windows Batch / CMD", syntax: "batch", scriptNoun: "Script" },
  bat: { label: "Windows Batch / CMD", syntax: "batch", scriptNoun: "Script" },
  javascript: { label: "JavaScript", syntax: "javascript", scriptNoun: "File" },
  js: { label: "JavaScript", syntax: "javascript", scriptNoun: "File" },
  typescript: { label: "TypeScript", syntax: "typescript", scriptNoun: "File" },
  ts: { label: "TypeScript", syntax: "typescript", scriptNoun: "File" },
  json: { label: "JSON", syntax: "json", scriptNoun: "Document" },
  yaml: { label: "YAML", syntax: "yaml", scriptNoun: "Document" },
  yml: { label: "YAML", syntax: "yaml", scriptNoun: "Document" },
  sql: { label: "SQL", syntax: "sql", scriptNoun: "Script" },
  html: { label: "HTML", syntax: "markup", scriptNoun: "Document" },
  markup: { label: "HTML", syntax: "markup", scriptNoun: "Document" },
  css: { label: "CSS", syntax: "css", scriptNoun: "File" },
  markdown: { label: "Markdown", syntax: "markdown", scriptNoun: "Document" },
  md: { label: "Markdown", syntax: "markdown", scriptNoun: "Document" },
  text: { label: "Plain text", scriptNoun: "Document" },
  plaintext: { label: "Plain text", scriptNoun: "Document" },
  txt: { label: "Plain text", scriptNoun: "Document" },
};

export function countLines(code: string): number {
  if (code.length === 0) return 0;

  const breaks = code.match(/\r\n|\r|\n/g)?.length ?? 0;
  const endsWithBreak = /(?:\r\n|\r|\n)$/.test(code);
  return Math.max(1, breaks + (endsWithBreak ? 0 : 1));
}

export function getLanguageInfo(language?: string): LanguageInfo {
  const normalized = language?.trim().toLowerCase();
  if (!normalized) return { label: "Plain text", scriptNoun: "Document" };

  return (
    LANGUAGE_ALIASES[normalized] ?? {
      label: language!.trim(),
      scriptNoun: "File",
    }
  );
}

export function resolveFilename(filename: string | undefined, language?: string): string {
  const trimmed = filename?.trim();
  if (trimmed) return trimmed;

  const info = getLanguageInfo(language);
  return `Untitled ${info.label} ${info.scriptNoun ?? "File"}`;
}

export function getCodeMetadata(input: CodeViewerInput): CodeMetadata {
  return {
    filename: resolveFilename(input.filename, input.language),
    language: getLanguageInfo(input.language).label,
    lineCount: countLines(input.code),
    characterCount: input.code.length,
  };
}

export function isCompletePayload(code: string, metadata?: Pick<CodeMetadata, "lineCount" | "characterCount">): boolean {
  if (!metadata) return false;
  return code.length === metadata.characterCount && countLines(code) === metadata.lineCount;
}
