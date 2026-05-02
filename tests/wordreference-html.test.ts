import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAudioSourcesFromPaths,
  extractAudioPathsFromHtml,
  sanitizeWordReferenceRoot,
} from "@/shared/wordreference-html";

describe("wordreference html helpers", () => {
  it("extracts audio paths and labels from focused fixture html", () => {
    const html = readFileSync(resolve("tests/fixtures/audio-sample.html"), "utf8");
    const paths = extractAudioPathsFromHtml(html);

    expect(paths).toEqual([
      "/audio/en/us/word.mp3",
      "/audio/en/uk/word.mp3",
    ]);
    expect(buildAudioSourcesFromPaths(paths)).toEqual([
      {
        label: "EN-US",
        url: "https://www.wordreference.com/audio/en/us/word.mp3",
      },
      {
        label: "EN-UK",
        url: "https://www.wordreference.com/audio/en/uk/word.mp3",
      },
    ]);
  });

  it("rewrites relative urls, strips inline handlers, and normalizes tooltip markup", () => {
    const parser = new DOMParser();
    const html = readFileSync(resolve("tests/fixtures/tooltip-sample.html"), "utf8");
    const document = parser.parseFromString(html, "text/html");
    const root = document.querySelector("#centercolumn");

    expect(root).not.toBeNull();
    sanitizeWordReferenceRoot(root!);

    const link = root!.querySelector("a");
    const image = root!.querySelector("img");
    const tooltip = root!.querySelector(".tooltip span");
    const button = root!.querySelector("button");

    expect(link?.getAttribute("href")).toBe("https://www.wordreference.com/test");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(image?.getAttribute("src")).toBe(
      "https://www.wordreference.com/images/sample.png",
    );
    expect(tooltip?.innerHTML).toContain("<b>tooltip</b>");
    expect(button?.getAttribute("onclick")).toBeNull();
  });
});
