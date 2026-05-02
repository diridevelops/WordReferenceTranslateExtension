import { MAX_SEARCH_LENGTH } from "@/shared/constants";
import type {
  LanguageCode,
  TranslationMeta,
  TranslationRequest,
  TranslationResponse,
} from "@/shared/types";
import { getAutoDetectCandidateLanguages } from "./auto-detect";

const WORDREFERENCE_ROOT = "https://www.wordreference.com";
const VALID_QUERY_RE = /^[^<>%\\]*$/;
const HAS_RESULTS_RE =
  /id=["']articleWRD["'][\s\S]*?(?:<tr|class=["']WRD["'])/i;

function normalizeWord(input: string): string {
  return input.trim();
}

function validateWord(word: string): void {
  if (!word || word.length > MAX_SEARCH_LENGTH || !VALID_QUERY_RE.test(word)) {
    throw new Error("Invalid text");
  }
}

function buildLookupUrl(dict1: string, dict2: string, word: string): string {
  return `${WORDREFERENCE_ROOT}/${dict1}${dict2}/${encodeURIComponent(word)}`;
}

function hasResults(html: string): boolean {
  return HAS_RESULTS_RE.test(html);
}

async function fetchLookup(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Error contacting wordreference.com: ${response.status}`);
  }

  return response.text();
}

async function fetchDirectOrInverted(
  dict1: Exclude<LanguageCode, "auto">,
  dict2: Exclude<LanguageCode, "auto">,
  word: string,
  allowInvert = true,
): Promise<TranslationResponse> {
  const directUrl = buildLookupUrl(dict1, dict2, word);
  const directHtml = await fetchLookup(directUrl);

  if (hasResults(directHtml)) {
    const meta: TranslationMeta = {
      requestedDict1: dict1,
      requestedDict2: dict2,
      resolvedDict1: dict1,
      resolvedDict2: dict2,
      sourceUrl: directUrl,
      queriedWord: word,
    };
    return { ok: true, html: directHtml, meta };
  }

  if (!allowInvert) {
    throw new Error(`No result found for ${word}`);
  }

  const invertedUrl = buildLookupUrl(dict2, dict1, word);
  const invertedHtml = await fetchLookup(invertedUrl);

  if (!hasResults(invertedHtml)) {
    throw new Error(`No result found for ${word}`);
  }

  const meta: TranslationMeta = {
    requestedDict1: dict1,
    requestedDict2: dict2,
    resolvedDict1: dict2,
    resolvedDict2: dict1,
    sourceUrl: invertedUrl,
    queriedWord: word,
  };
  return { ok: true, html: invertedHtml, meta };
}

async function fetchAutoDetect(
  dict2: Exclude<LanguageCode, "auto">,
  word: string,
): Promise<TranslationResponse> {
  for (const dict1 of getAutoDetectCandidateLanguages(dict2)) {
    try {
      return await fetchDirectOrInverted(dict1, dict2, word, false);
    } catch {
      // Continue until a language pair resolves successfully.
    }
  }

  throw new Error(`No result found for ${word}`);
}

export async function translateWord(
  request: TranslationRequest,
): Promise<TranslationResponse> {
  const word = normalizeWord(request.word);
  validateWord(word);

  if (request.dict2 === null) {
    throw new Error("No target language selected");
  }

  if (request.dict1 === "auto") {
    return fetchAutoDetect(request.dict2, word);
  }

  return fetchDirectOrInverted(request.dict1, request.dict2, word, true);
}
