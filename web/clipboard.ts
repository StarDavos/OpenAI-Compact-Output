export type ClipboardWriter = {
  writeText(text: string): Promise<void>;
};

export type ExactCopyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unavailable" | "rejected";
      errorName?: string;
    };

function getDefaultClipboard(): ClipboardWriter | undefined {
  if (typeof navigator === "undefined") return undefined;
  const clipboard = navigator.clipboard;
  return clipboard?.writeText ? clipboard : undefined;
}

export async function writeExactText(
  text: string,
  clipboard: ClipboardWriter | undefined = getDefaultClipboard(),
): Promise<ExactCopyResult> {
  if (!clipboard) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    await clipboard.writeText(text);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "rejected",
      errorName: error instanceof Error && error.name ? error.name : undefined,
    };
  }
}
