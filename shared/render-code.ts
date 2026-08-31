import { z } from "zod";
import { getCodeMetadata, type CodeViewerInput } from "./code.js";

export const MAX_CODE_CHARACTERS = 200_000;
export const MAX_FILENAME_CHARACTERS = 512;
export const MAX_LANGUAGE_CHARACTERS = 64;
export const MAX_MCP_REQUEST_BYTES = 1_048_576;

const noControlCharacters = (value: string) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value);

export const renderCodeInputSchema = z
  .object({
    filename: z
      .string()
      .max(MAX_FILENAME_CHARACTERS, `Filename must be ${MAX_FILENAME_CHARACTERS} characters or fewer.`)
      .refine(noControlCharacters, "Filename must not contain control characters.")
      .optional()
      .describe("Optional filename or path to display, such as scripts/analyzer.py."),
    language: z
      .string()
      .max(MAX_LANGUAGE_CHARACTERS, `Language must be ${MAX_LANGUAGE_CHARACTERS} characters or fewer.`)
      .refine(noControlCharacters, "Language must not contain control characters.")
      .optional()
      .describe("Language label supplied by the model, such as python, powershell, json, or typescript."),
    code: z
      .string()
      .min(1, "Code must not be empty.")
      .max(MAX_CODE_CHARACTERS, `Code exceeds the supported ${MAX_CODE_CHARACTERS}-character limit.`)
      .describe("The complete, unmodified code or technical text. Never truncate, summarize, execute, or replace sections with ellipses."),
  })
  .strict();

export const renderCodeInputShape = renderCodeInputSchema.shape;
export type RenderCodeInput = z.infer<typeof renderCodeInputSchema>;

export function parseRenderCodeInput(input: unknown): RenderCodeInput {
  return renderCodeInputSchema.parse(input);
}

export function buildRenderCodeResult(input: CodeViewerInput) {
  const metadata = getCodeMetadata(input);

  return {
    content: [
      {
        type: "text" as const,
        text: `The complete content is rendered in Compact Code Viewer (${metadata.lineCount.toLocaleString()} lines). Do not repeat the code in a markdown block.`,
      },
    ],
    structuredContent: {
      ...metadata,
      complete: true,
    },
  };
}
