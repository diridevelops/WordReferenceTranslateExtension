import { afterEach, describe, expect, it, vi } from "vitest";
import { translateWord } from "@/core/wordreference";

const htmlWithResult =
  '<div id="articleWRD"><table><tr><td>hello</td></tr></table></div>';
const htmlWithoutResult = "<div id='articleWRD'></div>";

describe("translateWord", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the direct lookup when the first pair resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => htmlWithResult,
      }),
    );

    const result = await translateWord({
      dict1: "en",
      dict2: "it",
      word: "hello",
    });
    expect(result.ok).toBe(true);
    expect(result.meta.resolvedDict1).toBe("en");
    expect(result.meta.sourceUrl).toContain("/enit/hello");
  });

  it("falls back to the inverted pair when the direct lookup has no rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => htmlWithoutResult,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => htmlWithResult,
        }),
    );

    const result = await translateWord({
      dict1: "en",
      dict2: "it",
      word: "ciao",
    });
    expect(result.meta.resolvedDict1).toBe("it");
    expect(result.meta.resolvedDict2).toBe("en");
  });

  it("tries multiple language pairs for auto-detect", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => htmlWithoutResult,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => htmlWithResult,
        }),
    );

    const result = await translateWord({
      dict1: "auto",
      dict2: "it",
      word: "hello",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid user input", async () => {
    await expect(
      translateWord({ dict1: "en", dict2: "it", word: "<script>" }),
    ).rejects.toThrow("Invalid text");
  });
});
