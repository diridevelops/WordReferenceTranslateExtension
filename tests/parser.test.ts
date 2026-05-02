import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTranslationHtml } from "@/core/parse";

const fixture = readFileSync(resolve("tests/fixtures/hello-enit.html"), "utf8");
const notFoundFixture = readFileSync(
  resolve("tests/fixtures/not-found.html"),
  "utf8",
);

describe("parseTranslationHtml", () => {
  it("extracts the main result sections from a live fixture", () => {
    const result = parseTranslationHtml(fixture, {
      requestedDict1: "en",
      requestedDict2: "it",
      resolvedDict1: "en",
      resolvedDict2: "it",
      sourceUrl: "https://www.wordreference.com/enit/hello",
      queriedWord: "hello",
    });

    expect(result.status).toBe("found");
    if (result.status !== "found") {
      throw new Error("Expected a found result");
    }

    expect(result.headword.toLowerCase()).toContain("hello");
    expect(result.bodyHtml).toContain("articleWRD");
    expect(result.audioSources.length).toBeGreaterThan(0);
  });

  it("rewrites relative links and assets to absolute urls", () => {
    const result = parseTranslationHtml(fixture, {
      requestedDict1: "en",
      requestedDict2: "it",
      resolvedDict1: "en",
      resolvedDict2: "it",
      sourceUrl: "https://www.wordreference.com/enit/hello",
      queriedWord: "hello",
    });

    expect(result.status).toBe("found");
    if (result.status !== "found") {
      throw new Error("Expected a found result");
    }

    expect(result.bodyHtml).not.toContain('href="/');
    expect(result.bodyHtml).not.toContain('src="/');
  });

  it("parses not-found pages and extracts similar words", () => {
    const result = parseTranslationHtml(notFoundFixture, {
      requestedDict1: "en",
      requestedDict2: "it",
      resolvedDict1: "en",
      resolvedDict2: "it",
      sourceUrl: "https://www.wordreference.com/enit/tets",
      queriedWord: "tets",
    });

    expect(result.status).toBe("not_found");
    if (result.status !== "not_found") {
      throw new Error("Expected a not-found result");
    }

    expect(result.message).toContain("tets");
    expect(result.similarWords.map((entry) => entry.word)).toEqual([
      "test",
      "tats",
      "tots",
      "totes",
      "stets",
    ]);
    expect(result.similarWords.map((entry) => entry.normalized)).toEqual([
      "test",
      "tats",
      "tots",
      "totes",
      "stets",
    ]);
  });
});
