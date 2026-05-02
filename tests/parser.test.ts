import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTranslationHtml } from "@/core/parse";

const fixture = readFileSync(resolve("tests/fixtures/hello-enit.html"), "utf8");

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

    expect(result.bodyHtml).not.toContain('href="/');
    expect(result.bodyHtml).not.toContain('src="/');
  });
});
