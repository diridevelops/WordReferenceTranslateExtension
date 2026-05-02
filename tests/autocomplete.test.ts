import { describe, expect, it } from "vitest";
import {
  AUTO_AUTOCOMPLETE_LIMIT,
  SOURCE_AUTOCOMPLETE_LIMIT,
  TARGET_AUTOCOMPLETE_LIMIT,
  buildPopupAutocomplete,
  getAutocompleteRange,
  lookupAutocompleteDataset,
  normalizeAutocompleteQuery,
} from "@/shared/autocomplete";
import type { AutocompleteDataset } from "@/shared/types";

const englishDataset: AutocompleteDataset = {
  language: "en",
  entries: [
    ["cabal", "cabal", 10],
    ["cabin", "cabin", 5],
    ["cabotage", "cabotage", 30],
    ["café", "cafe", 2],
    ["camera", "camera", 1],
    ["camp", "camp", 7],
    ["cat", "cat", 3],
  ],
  index: {
    ca: [0, 7],
  },
};

const italianDataset: AutocompleteDataset = {
  language: "it",
  entries: [
    ["caffè", "caffe", 4],
    ["calcio", "calcio", 8],
    ["camera", "camera", 2],
    ["campana", "campana", 12],
  ],
  index: {
    ca: [0, 4],
  },
};

const spanishDataset: AutocompleteDataset = {
  language: "es",
  entries: [
    ["cabello", "cabello", 6],
    ["cabra", "cabra", 12],
    ["café", "cafe", 3],
    ["camino", "camino", 7],
  ],
  index: {
    ca: [0, 4],
  },
};

const frenchDataset: AutocompleteDataset = {
  language: "fr",
  entries: [
    ["cabane", "cabane", 11],
    ["café", "cafe", 4],
    ["caméra", "camera", 8],
    ["camp", "camp", 9],
  ],
  index: {
    ca: [0, 4],
  },
};

describe("autocomplete helpers", () => {
  it("folds accents and punctuation for prefix matching", () => {
    expect(normalizeAutocompleteQuery(" Café ")).toBe("cafe");
    expect(normalizeAutocompleteQuery("l'élève")).toBe("leleve");
  });

  it("returns the indexed range for a two-character prefix", () => {
    expect(getAutocompleteRange(englishDataset, "ca")).toEqual([0, 7]);
    expect(getAutocompleteRange(englishDataset, "zz")).toBeNull();
  });

  it("returns prefix-only results sorted by rank", () => {
    expect(
      lookupAutocompleteDataset(englishDataset, "ca", 4).map(
        (autocompleteItem) => autocompleteItem.display,
      ),
    ).toEqual(["camera", "café", "cat", "cabin"]);
  });

  it("matches accent-folded queries against accented display words", () => {
    expect(
      lookupAutocompleteDataset(englishDataset, "cafe", 3).map(
        (autocompleteItem) => autocompleteItem.display,
      ),
    ).toEqual(["café"]);
    expect(
      lookupAutocompleteDataset(italianDataset, "caffe", 3).map(
        (autocompleteItem) => autocompleteItem.display,
      ),
    ).toEqual(["caffè"]);
  });

  it("returns language tags for rendered autocomplete items", () => {
    expect(
      lookupAutocompleteDataset(italianDataset, "ca", 2).map(
        (autocompleteItem) => autocompleteItem.tag,
      ),
    ).toEqual(["IT", "IT"]);
  });
});

describe("buildPopupAutocomplete", () => {
  const datasets: Partial<Record<"en" | "es" | "fr" | "it", AutocompleteDataset>> =
    {
      en: englishDataset,
      es: spanishDataset,
      fr: frenchDataset,
      it: italianDataset,
    };

  it("returns up to 6 source autocomplete items and 4 target autocomplete items", () => {
    const results = buildPopupAutocomplete(datasets, {
      query: "ca",
      dict1: "en",
      dict2: "it",
    });

    expect(
      results
        .slice(0, SOURCE_AUTOCOMPLETE_LIMIT)
        .map((entry) => entry.language),
    ).toEqual(["en", "en", "en", "en", "en", "en"]);
    expect(results.map((entry) => entry.language)).toEqual([
      "en",
      "en",
      "en",
      "en",
      "en",
      "en",
      "it",
      "it",
      "it",
    ]);
  });

  it("does not backfill missing target slots with source autocomplete items", () => {
    const limitedTargetDataset: AutocompleteDataset = {
      language: "it",
      entries: [["caffè", "caffe", 4]],
      index: {
        ca: [0, 1],
      },
    };

    const results = buildPopupAutocomplete(
      {
        en: englishDataset,
        it: limitedTargetDataset,
      },
      {
        query: "ca",
        dict1: "en",
        dict2: "it",
      },
    );

    expect(results).toHaveLength(SOURCE_AUTOCOMPLETE_LIMIT + 1);
    expect(results.at(-1)?.display).toBe("caffè");
  });

  it("deduplicates normalized duplicates across source and target lists", () => {
    const results = buildPopupAutocomplete(datasets, {
      query: "cam",
      dict1: "en",
      dict2: "it",
    });

    expect(results.map((entry) => entry.normalized)).toEqual([
      "camera",
      "camp",
      "campana",
    ]);
  });

  it("returns merged-source autocomplete only for auto-detect", () => {
    const results = buildPopupAutocomplete(datasets, {
      query: "ca",
      dict1: "auto",
      dict2: "it",
    });

    expect(results).toHaveLength(AUTO_AUTOCOMPLETE_LIMIT);
    expect(results.map((entry) => entry.language)).toEqual([
      "en",
      "es",
      "es",
      "it",
      "en",
      "es",
      "fr",
      "it",
      "en",
      "es",
    ]);
    expect(results.map((entry) => entry.normalized)).toEqual([
      "camera",
      "cafe",
      "cabello",
      "caffe",
      "cat",
      "camino",
      "camp",
      "calcio",
      "cabin",
      "cabra",
    ]);
  });

  it("returns empty results for short queries", () => {
    expect(
      buildPopupAutocomplete(datasets, {
        query: "c",
        dict1: "en",
        dict2: "it",
      }),
    ).toEqual([]);
  });

  it("returns a single-language list when source and target are the same", () => {
    const results = buildPopupAutocomplete(datasets, {
      query: "ca",
      dict1: "en",
      dict2: "en",
    });

    expect(results).toHaveLength(7);
    expect(new Set(results.map((entry) => entry.language))).toEqual(
      new Set(["en"]),
    );
  });

  it("caps target autocomplete items at the configured target quota", () => {
    const results = buildPopupAutocomplete(datasets, {
      query: "ca",
      dict1: "de",
      dict2: "it",
    });

    expect(results).toHaveLength(TARGET_AUTOCOMPLETE_LIMIT);
    expect(results.map((entry) => entry.language)).toEqual([
      "it",
      "it",
      "it",
      "it",
    ]);
  });
});
