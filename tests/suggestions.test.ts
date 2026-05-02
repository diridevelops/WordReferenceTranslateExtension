import { describe, expect, it } from "vitest";
import {
  AUTO_SUGGESTION_LIMIT,
  SOURCE_SUGGESTION_LIMIT,
  TARGET_SUGGESTION_LIMIT,
  buildPopupSuggestions,
  getSuggestionRange,
  lookupSuggestionDataset,
  normalizeSuggestionQuery,
} from "@/shared/suggestions";
import type { SuggestionDataset } from "@/shared/types";

const englishDataset: SuggestionDataset = {
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

const italianDataset: SuggestionDataset = {
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

const spanishDataset: SuggestionDataset = {
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

const frenchDataset: SuggestionDataset = {
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

describe("suggestions helpers", () => {
  it("folds accents and punctuation for prefix matching", () => {
    expect(normalizeSuggestionQuery(" Café ")).toBe("cafe");
    expect(normalizeSuggestionQuery("l'élève")).toBe("leleve");
  });

  it("returns the indexed range for a two-character prefix", () => {
    expect(getSuggestionRange(englishDataset, "ca")).toEqual([0, 7]);
    expect(getSuggestionRange(englishDataset, "zz")).toBeNull();
  });

  it("returns prefix-only results sorted by rank", () => {
    expect(
      lookupSuggestionDataset(englishDataset, "ca", 4).map(
        (suggestion) => suggestion.display,
      ),
    ).toEqual(["camera", "café", "cat", "cabin"]);
  });

  it("matches accent-folded queries against accented display words", () => {
    expect(
      lookupSuggestionDataset(englishDataset, "cafe", 3).map(
        (suggestion) => suggestion.display,
      ),
    ).toEqual(["café"]);
    expect(
      lookupSuggestionDataset(italianDataset, "caffe", 3).map(
        (suggestion) => suggestion.display,
      ),
    ).toEqual(["caffè"]);
  });

  it("returns language tags for rendered suggestions", () => {
    expect(
      lookupSuggestionDataset(italianDataset, "ca", 2).map(
        (suggestion) => suggestion.tag,
      ),
    ).toEqual(["IT", "IT"]);
  });
});

describe("buildPopupSuggestions", () => {
  const datasets: Partial<Record<"en" | "es" | "fr" | "it", SuggestionDataset>> =
    {
      en: englishDataset,
      es: spanishDataset,
      fr: frenchDataset,
      it: italianDataset,
    };

  it("returns up to 6 source suggestions and 4 target suggestions", () => {
    const results = buildPopupSuggestions(datasets, {
      query: "ca",
      dict1: "en",
      dict2: "it",
    });

    expect(
      results
        .slice(0, SOURCE_SUGGESTION_LIMIT)
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

  it("does not backfill missing target slots with source suggestions", () => {
    const limitedTargetDataset: SuggestionDataset = {
      language: "it",
      entries: [["caffè", "caffe", 4]],
      index: {
        ca: [0, 1],
      },
    };

    const results = buildPopupSuggestions(
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

    expect(results).toHaveLength(SOURCE_SUGGESTION_LIMIT + 1);
    expect(results.at(-1)?.display).toBe("caffè");
  });

  it("deduplicates normalized duplicates across source and target lists", () => {
    const results = buildPopupSuggestions(datasets, {
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

  it("returns merged-source suggestions only for auto-detect", () => {
    const results = buildPopupSuggestions(datasets, {
      query: "ca",
      dict1: "auto",
      dict2: "it",
    });

    expect(results).toHaveLength(AUTO_SUGGESTION_LIMIT);
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
      buildPopupSuggestions(datasets, {
        query: "c",
        dict1: "en",
        dict2: "it",
      }),
    ).toEqual([]);
  });

  it("returns a single-language list when source and target are the same", () => {
    const results = buildPopupSuggestions(datasets, {
      query: "ca",
      dict1: "en",
      dict2: "en",
    });

    expect(results).toHaveLength(7);
    expect(new Set(results.map((entry) => entry.language))).toEqual(
      new Set(["en"]),
    );
  });

  it("caps target suggestions at the configured target quota", () => {
    const results = buildPopupSuggestions(datasets, {
      query: "ca",
      dict1: "de",
      dict2: "it",
    });

    expect(results).toHaveLength(TARGET_SUGGESTION_LIMIT);
    expect(results.map((entry) => entry.language)).toEqual([
      "it",
      "it",
      "it",
      "it",
    ]);
  });
});
