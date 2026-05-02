import type {
  AutocompleteDataset,
  AutocompleteLanguage,
  AutocompleteResult,
  LanguageCode,
} from "./types";

export const SUPPORTED_AUTOCOMPLETE_LANGUAGES = [
  "en",
  "es",
  "fr",
  "it",
] as const;
export const MIN_AUTOCOMPLETE_QUERY_LENGTH = 2;
export const SOURCE_AUTOCOMPLETE_LIMIT = 6;
export const TARGET_AUTOCOMPLETE_LIMIT = 4;
export const AUTO_AUTOCOMPLETE_LIMIT = 10;

const autocompleteDatasetCache = new Map<
  AutocompleteLanguage,
  Promise<AutocompleteDataset>
>();

function isAutocompleteLanguage(
  language: LanguageCode | null,
): language is AutocompleteLanguage {
  return (
    language !== null &&
    (SUPPORTED_AUTOCOMPLETE_LANGUAGES as readonly string[]).includes(language)
  );
}

export function normalizeAutocompleteQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z]/g, "");
}

export function getAutocompleteRange(
  dataset: AutocompleteDataset,
  normalizedQuery: string,
): [number, number] | null {
  if (normalizedQuery.length < MIN_AUTOCOMPLETE_QUERY_LENGTH) {
    return null;
  }

  return dataset.index[normalizedQuery.slice(0, 2)] ?? null;
}

export function lookupAutocompleteDataset(
  dataset: AutocompleteDataset,
  normalizedQuery: string,
  limit: number,
): AutocompleteResult[] {
  const range = getAutocompleteRange(dataset, normalizedQuery);
  if (!range) {
    return [];
  }

  const [start, end] = range;
  const matches: AutocompleteResult[] = [];

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

async function loadAutocompleteDataset(
  language: AutocompleteLanguage,
): Promise<AutocompleteDataset> {
  const cached = autocompleteDatasetCache.get(language);
  if (cached) {
    return cached;
  }

  const request = fetch(
    `/data/autocomplete_datasets/${language}.json`,
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Unable to load autocomplete datasets for ${language}`);
    }

    return (await response.json()) as AutocompleteDataset;
  });

  autocompleteDatasetCache.set(language, request);
  return request;
}

function dedupeAutocompleteResults(
  autocompleteResults: AutocompleteResult[],
): AutocompleteResult[] {
  const seen = new Set<string>();
  return autocompleteResults.filter((autocompleteResult) => {
    if (seen.has(autocompleteResult.normalized)) {
      return false;
    }
    seen.add(autocompleteResult.normalized);
    return true;
  });
}

function mergeAutoAutocomplete(
  groupedAutocompleteResults: AutocompleteResult[][],
): AutocompleteResult[] {
  const merged: AutocompleteResult[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (merged.length < AUTO_AUTOCOMPLETE_LIMIT) {
    let addedAtOffset = false;

    for (const autocompleteResults of groupedAutocompleteResults) {
      const autocompleteResult = autocompleteResults[offset];
      if (!autocompleteResult || seen.has(autocompleteResult.normalized)) {
        continue;
      }

      seen.add(autocompleteResult.normalized);
      merged.push(autocompleteResult);
      addedAtOffset = true;

      if (merged.length >= AUTO_AUTOCOMPLETE_LIMIT) {
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

export function buildPopupAutocomplete(
  datasets: Partial<Record<AutocompleteLanguage, AutocompleteDataset>>,
  input: {
    query: string;
    dict1: LanguageCode | null;
    dict2: Exclude<LanguageCode, "auto"> | null;
  },
): AutocompleteResult[] {
  const normalizedQuery = normalizeAutocompleteQuery(input.query);
  if (
    normalizedQuery.length < MIN_AUTOCOMPLETE_QUERY_LENGTH ||
    !input.dict1 ||
    !input.dict2
  ) {
    return [];
  }

  if (input.dict1 === "auto") {
    const grouped = SUPPORTED_AUTOCOMPLETE_LANGUAGES.map((language) => {
      const dataset = datasets[language];
      return dataset
        ? lookupAutocompleteDataset(
            dataset,
            normalizedQuery,
            AUTO_AUTOCOMPLETE_LIMIT,
          )
        : [];
    });

    return mergeAutoAutocomplete(grouped);
  }

  if (input.dict1 === input.dict2 && isAutocompleteLanguage(input.dict1)) {
    const dataset = datasets[input.dict1];
    return dataset
      ? lookupAutocompleteDataset(
          dataset,
          normalizedQuery,
          AUTO_AUTOCOMPLETE_LIMIT,
        )
      : [];
  }

  const sourceAutocompleteResults =
    isAutocompleteLanguage(input.dict1) && datasets[input.dict1]
      ? (() => {
          const dataset = datasets[input.dict1];
          return dataset
            ? lookupAutocompleteDataset(
                dataset,
                normalizedQuery,
                SOURCE_AUTOCOMPLETE_LIMIT,
              )
            : [];
        })()
      : [];

  const targetAutocompleteResults =
    isAutocompleteLanguage(input.dict2) && datasets[input.dict2]
      ? (() => {
          const dataset = datasets[input.dict2];
          return dataset
            ? lookupAutocompleteDataset(
                dataset,
                normalizedQuery,
                TARGET_AUTOCOMPLETE_LIMIT,
              )
            : [];
        })()
      : [];

  return dedupeAutocompleteResults([
    ...sourceAutocompleteResults,
    ...targetAutocompleteResults,
  ]);
}

export async function getPopupAutocomplete(input: {
  query: string;
  dict1: LanguageCode | null;
  dict2: Exclude<LanguageCode, "auto"> | null;
}): Promise<AutocompleteResult[]> {
  const normalizedQuery = normalizeAutocompleteQuery(input.query);
  if (normalizedQuery.length < MIN_AUTOCOMPLETE_QUERY_LENGTH) {
    return [];
  }

  if (input.dict1 === "auto") {
    const datasets = await Promise.all(
      SUPPORTED_AUTOCOMPLETE_LANGUAGES.map((language) =>
        loadAutocompleteDataset(language),
      ),
    );

    return buildPopupAutocomplete(
      Object.fromEntries(
        datasets.map((dataset) => [dataset.language, dataset]),
      ) as Record<AutocompleteLanguage, AutocompleteDataset>,
      input,
    );
  }

  const datasets: Partial<Record<AutocompleteLanguage, AutocompleteDataset>> =
    {};
  const languagesToLoad = new Set<AutocompleteLanguage>();

  if (isAutocompleteLanguage(input.dict1)) {
    languagesToLoad.add(input.dict1);
  }
  if (isAutocompleteLanguage(input.dict2)) {
    languagesToLoad.add(input.dict2);
  }

  const loadedDatasets = await Promise.all(
    [...languagesToLoad].map((language) => loadAutocompleteDataset(language)),
  );

  for (const dataset of loadedDatasets) {
    datasets[dataset.language] = dataset;
  }

  return buildPopupAutocomplete(datasets, input);
}
