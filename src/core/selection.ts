import type { TranslationResult } from "@/shared/types";

function findSelectedWordFromNode(
  node: Node | null,
  offset: number,
): string | null {
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = node.textContent?.trim() ?? "";
  if (!text) {
    return null;
  }

  const words = text.split(/\s+/);
  let total = 0;

  for (const word of words) {
    total += word.length + 1;
    if (offset < total) {
      return word.replace(/[(),.;:!?]/g, "");
    }
  }

  return words[0]?.replace(/[(),.;:!?]/g, "") ?? null;
}

export function resolveInteractiveLookup(
  document: Document,
  target: EventTarget | null,
  result: TranslationResult,
): {
  word: string;
  dict1: typeof result.resolvedDict1;
  dict2: typeof result.resolvedDict2;
} | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest("a, button, select, .tooltip")) {
    return null;
  }

  const selection = document.getSelection();
  const selectedWord = findSelectedWordFromNode(
    selection?.anchorNode ?? null,
    selection?.anchorOffset ?? 0,
  );

  const fallbackWord = target.textContent
    ?.trim()
    .split(/\s+/)[0]
    ?.replace(/[(),.;:!?]/g, "");
  const word = selectedWord || fallbackWord;
  if (!word) {
    return null;
  }

  const invert = Boolean(target.closest(".ToWrd, .ToEx, .dsense"));

  return invert
    ? {
        word,
        dict1: result.resolvedDict2,
        dict2: result.resolvedDict1,
      }
    : {
        word,
        dict1: result.resolvedDict1,
        dict2: result.resolvedDict2,
      };
}
