import type {
  LanguageCode,
  SuggestionDataset,
  SuggestionLanguage,
  SuggestionResult,
} from "./types";

export const SUPPORTED_SUGGESTION_LANGUAGES = [
  "en",
  "es",
  "fr",
  "it",
] as const;
export const MIN_SUGGESTION_QUERY_LENGTH = 2;
export const SOURCE_SUGGESTION_LIMIT = 6;
export const TARGET_SUGGESTION_LIMIT = 4;
export const AUTO_SUGGESTION_LIMIT = 10;

const datasetCache = new Map<SuggestionLanguage, Promise<SuggestionDataset>>();

function isSuggestionLanguage(
  language: LanguageCode | null,
): language is SuggestionLanguage {
  return (
    language !== null &&
    (SUPPORTED_SUGGESTION_LANGUAGES as readonly string[]).includes(language)
  );
}

export function normalizeSuggestionQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "");
}

export function getSuggestionRange(
  dataset: SuggestionDataset,
  normalizedQuery: string,
): [number, number] | null {
  if (normalizedQuery.length < MIN_SUGGESTION_QUERY_LENGTH) {
    return null;
  }

  return dataset.index[normalizedQuery.slice(0, 2)] ?? null;
}

export function lookupSuggestionDataset(
  dataset: SuggestionDataset,
  normalizedQuery: string,
  limit: number,
): SuggestionResult[] {
  const range = getSuggestionRange(dataset, normalizedQuery);
  if (!range) {
    return [];
  }

  const [start, end] = range;
  const matches: SuggestionResult[] = [];

  for (let index = start; index < end; index += 1) {
    const entry = dataset.entries[index];
    if (!entry) {
      continue;
    }

    const [display, normalized, rank] = entry;
    if (!normalized.startsWith(normalizedQuery)) {
      continue;
    }

    matches.push({
      display,
      normalized,
      language: dataset.language,
      tag: dataset.language.toUpperCase(),
      rank,
    });
  }

  matches.sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    if (left.display.length !== right.display.length) {
      return left.display.length - right.display.length;
    }

    return left.display.localeCompare(right.display);
  });

  return matches.slice(0, limit);
}

async function loadSuggestionDataset(
  language: SuggestionLanguage,
): Promise<SuggestionDataset> {
  const cached = datasetCache.get(language);
  if (cached) {
    return cached;
  }

  const request = fetch(
    `/data/suggestions/${language}.json`,
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load suggestions for ${language}`);
    }

    return (await response.json()) as SuggestionDataset;
  });

  datasetCache.set(language, request);
  return request;
}

function dedupeSuggestions(suggestions: SuggestionResult[]): SuggestionResult[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.normalized)) {
      return false;
    }
    seen.add(suggestion.normalized);
    return true;
  });
}

function mergeAutoSuggestions(
  groupedSuggestions: SuggestionResult[][],
): SuggestionResult[] {
  const merged: SuggestionResult[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (merged.length < AUTO_SUGGESTION_LIMIT) {
    let addedAtOffset = false;

    for (const suggestions of groupedSuggestions) {
      const suggestion = suggestions[offset];
      if (!suggestion || seen.has(suggestion.normalized)) {
        continue;
      }

      seen.add(suggestion.normalized);
      merged.push(suggestion);
      addedAtOffset = true;

      if (merged.length >= AUTO_SUGGESTION_LIMIT) {
        break;
      }
    }

    if (!addedAtOffset) {
      break;
    }

    offset += 1;
  }

  return merged;
}

export function buildPopupSuggestions(
  datasets: Partial<Record<SuggestionLanguage, SuggestionDataset>>,
  input: {
    query: string;
    dict1: LanguageCode | null;
    dict2: Exclude<LanguageCode, "auto"> | null;
  },
): SuggestionResult[] {
  const normalizedQuery = normalizeSuggestionQuery(input.query);
  if (
    normalizedQuery.length < MIN_SUGGESTION_QUERY_LENGTH ||
    !input.dict1 ||
    !input.dict2
  ) {
    return [];
  }

  if (input.dict1 === "auto") {
    const grouped = SUPPORTED_SUGGESTION_LANGUAGES.map((language) => {
      const dataset = datasets[language];
      return dataset
        ? lookupSuggestionDataset(dataset, normalizedQuery, AUTO_SUGGESTION_LIMIT)
        : [];
    });

    return mergeAutoSuggestions(grouped);
  }

  if (input.dict1 === input.dict2 && isSuggestionLanguage(input.dict1)) {
    const dataset = datasets[input.dict1];
    return dataset
      ? lookupSuggestionDataset(dataset, normalizedQuery, AUTO_SUGGESTION_LIMIT)
      : [];
  }

  const sourceSuggestions =
    isSuggestionLanguage(input.dict1) && datasets[input.dict1]
      ? (() => {
          const dataset = datasets[input.dict1];
          return dataset
            ? lookupSuggestionDataset(
                dataset,
                normalizedQuery,
                SOURCE_SUGGESTION_LIMIT,
              )
            : [];
        })()
      : [];

  const targetSuggestions =
    isSuggestionLanguage(input.dict2) && datasets[input.dict2]
      ? (() => {
          const dataset = datasets[input.dict2];
          return dataset
            ? lookupSuggestionDataset(
                dataset,
                normalizedQuery,
                TARGET_SUGGESTION_LIMIT,
              )
            : [];
        })()
      : [];

  return dedupeSuggestions([...sourceSuggestions, ...targetSuggestions]);
}

export async function getPopupSuggestions(input: {
  query: string;
  dict1: LanguageCode | null;
  dict2: Exclude<LanguageCode, "auto"> | null;
}): Promise<SuggestionResult[]> {
  const normalizedQuery = normalizeSuggestionQuery(input.query);
  if (normalizedQuery.length < MIN_SUGGESTION_QUERY_LENGTH) {
    return [];
  }

  if (input.dict1 === "auto") {
    const datasets = await Promise.all(
      SUPPORTED_SUGGESTION_LANGUAGES.map((language) =>
        loadSuggestionDataset(language),
      ),
    );

    return buildPopupSuggestions(
      Object.fromEntries(
        datasets.map((dataset) => [dataset.language, dataset]),
      ) as Record<SuggestionLanguage, SuggestionDataset>,
      input,
    );
  }

  const datasets: Partial<Record<SuggestionLanguage, SuggestionDataset>> = {};
  const languagesToLoad = new Set<SuggestionLanguage>();

  if (isSuggestionLanguage(input.dict1)) {
    languagesToLoad.add(input.dict1);
  }
  if (isSuggestionLanguage(input.dict2)) {
    languagesToLoad.add(input.dict2);
  }

  const loadedDatasets = await Promise.all(
    [...languagesToLoad].map((language) => loadSuggestionDataset(language)),
  );

  for (const dataset of loadedDatasets) {
    datasets[dataset.language] = dataset;
  }

  return buildPopupSuggestions(datasets, input);
}
