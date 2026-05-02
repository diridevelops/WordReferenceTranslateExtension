import type {
  SimilarWord,
  TranslationFoundResult,
  TranslationMeta,
  TranslationNotFoundResult,
  TranslationResult,
} from "@/shared/types";
import {
  buildAudioSourcesFromPaths,
  extractAudioPathsFromHtml,
  mergeVerbalFormLists,
  sanitizeWordReferenceRoot,
} from "@/shared/wordreference-html";

function normalizeSimilarWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function parseNotFoundResult(
  document: Document,
  meta: TranslationMeta,
): TranslationNotFoundResult | null {
  const noTransFound = document.querySelector<HTMLElement>("#noTransFound");
  if (!noTransFound) {
    return null;
  }

  const message =
    noTransFound.querySelector("#noEntryFound")?.textContent?.trim() ?? "";
  const seen = new Set<string>();
  const similarWords: SimilarWord[] = [];

  noTransFound.querySelectorAll<HTMLAnchorElement>("#spellSug a").forEach((link) => {
    const word = link.textContent?.trim() ?? "";
    const normalized = normalizeSimilarWord(word);
    if (!word || !normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    similarWords.push({ word, normalized });
  });

  return {
    ...meta,
    status: "not_found",
    message,
    similarWords,
  };
}

function parseFoundResult(
  document: Document,
  html: string,
  meta: TranslationMeta,
): TranslationFoundResult {
  const centerColumn = document.querySelector("#centercolumn");
  const article = document.querySelector("#articleWRD");

  if (!centerColumn || !article) {
    throw new Error("Unexpected WordReference response format");
  }

  const audioSources = buildAudioSourcesFromPaths(
    extractAudioPathsFromHtml(html),
  );
  sanitizeWordReferenceRoot(centerColumn);

  const headword =
    document.querySelector(".headerWord")?.textContent?.trim() ??
    meta.queriedWord;
  const listenWidgetHtml =
    document.querySelector("#listen_widget")?.outerHTML ?? "";
  const pronunciationHtml =
    document.querySelector("#pronunciation_widget")?.outerHTML ?? "";
  const inflectionsHtml = mergeVerbalFormLists(
    document.querySelector("#articleHead"),
  )
    .map((node) => node.outerHTML)
    .join("");
  const bodyHtml = article.outerHTML;
  const linksHtml = document.querySelector("#WHlinks")?.outerHTML ?? "";

  return {
    ...meta,
    status: "found",
    headword,
    listenWidgetHtml,
    pronunciationHtml,
    inflectionsHtml,
    bodyHtml,
    linksHtml,
    audioSources,
  };
}

export function parseTranslationHtml(
  html: string,
  meta: TranslationMeta,
): TranslationResult {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  const notFoundResult = parseNotFoundResult(document, meta);
  if (notFoundResult) {
    return notFoundResult;
  }

  return parseFoundResult(document, html, meta);
}
