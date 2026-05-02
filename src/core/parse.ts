import type {
  TranslationMeta,
  TranslationResult,
} from "@/shared/types";
import {
  buildAudioSourcesFromPaths,
  extractAudioPathsFromHtml,
  mergeVerbalFormLists,
  sanitizeWordReferenceRoot,
} from "@/shared/wordreference-html";

export function parseTranslationHtml(
  html: string,
  meta: TranslationMeta,
): TranslationResult {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

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
    headword,
    pronunciationHtml,
    inflectionsHtml,
    bodyHtml,
    linksHtml,
    audioSources,
  };
}
