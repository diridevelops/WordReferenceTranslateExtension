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
const HAS_NOT_FOUND_RE = /id=["']noTransFound["']/i;

type LookupClassification = "found" | "not_found" | "unexpected";

interface LookupAttempt {
  html: string;
  meta: TranslationMeta;
  classification: LookupClassification;
}

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

function classifyLookupHtml(html: string): LookupClassification {
  if (HAS_RESULTS_RE.test(html)) {
    return "found";
  }

  if (HAS_NOT_FOUND_RE.test(html)) {
    return "not_found";
  }

  return "unexpected";
}

async function fetchLookup(
  url: string,
): Promise<{ html: string; ok: boolean; status: number }> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "omit",
  });

  return {
    html: await response.text(),
    ok: response.ok,
    status: response.status,
  };
}

async function fetchLookupAttempt(
  dict1: Exclude<LanguageCode, "auto">,
  dict2: Exclude<LanguageCode, "auto">,
  word: string,
): Promise<LookupAttempt> {
  const url = buildLookupUrl(dict1, dict2, word);
  const response = await fetchLookup(url);
  const classification = classifyLookupHtml(response.html);

  if (!response.ok && classification === "unexpected") {
    throw new Error(`Error contacting wordreference.com: ${response.status}`);
  }

  return {
    html: response.html,
    meta: {
      requestedDict1: dict1,
      requestedDict2: dict2,
      resolvedDict1: dict1,
      resolvedDict2: dict2,
      sourceUrl: url,
      queriedWord: word,
    },
    classification,
  };
}

async function fetchDirectOrInverted(
  dict1: Exclude<LanguageCode, "auto">,
  dict2: Exclude<LanguageCode, "auto">,
  word: string,
  allowInvert = true,
): Promise<TranslationResponse> {
  const direct = await fetchLookupAttempt(dict1, dict2, word);

  if (direct.classification === "found") {
    return { ok: true, html: direct.html, meta: direct.meta };
  }

  if (direct.classification === "unexpected") {
    throw new Error("Unexpected WordReference response format");
  }

  if (!allowInvert) {
    return { ok: true, html: direct.html, meta: direct.meta };
  }

  const inverted = await fetchLookupAttempt(dict2, dict1, word);

  if (inverted.classification === "found") {
    return { ok: true, html: inverted.html, meta: inverted.meta };
  }

  if (inverted.classification === "unexpected") {
    throw new Error("Unexpected WordReference response format");
  }

  return { ok: true, html: direct.html, meta: direct.meta };
}

async function fetchAutoDetect(
  dict2: Exclude<LanguageCode, "auto">,
  word: string,
): Promise<TranslationResponse> {
  let firstNotFound: LookupAttempt | null = null;
  let lastUnexpectedError: Error | null = null;

  for (const dict1 of getAutoDetectCandidateLanguages(dict2)) {
    try {
      const attempt = await fetchLookupAttempt(dict1, dict2, word);
      if (attempt.classification === "found") {
        return { ok: true, html: attempt.html, meta: attempt.meta };
      }

      if (attempt.classification === "not_found" && !firstNotFound) {
        firstNotFound = attempt;
      }
    } catch (error) {
      if (error instanceof Error) {
        lastUnexpectedError = error;
      }
    }
  }

  if (firstNotFound) {
    return {
      ok: true,
      html: firstNotFound.html,
      meta: firstNotFound.meta,
    };
  }

  if (lastUnexpectedError) {
    throw lastUnexpectedError;
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
