import { afterEach, describe, expect, it, vi } from "vitest";
import { translateWord } from "@/core/wordreference";

const browserMock = vi.hoisted(() => ({
  cookiesSet: vi.fn(),
}));

vi.mock("wxt/browser", () => ({
  browser: {
    cookies: {
      set: browserMock.cookiesSet,
    },
  },
}));

const htmlWithResult =
  '<div id="articleWRD"><table><tr><td>hello</td></tr></table></div>';
const htmlWithoutResult = `
  <div id="centercolumn">
    <div id="articleWRD"></div>
    <div id="noTransFound">
      <p id="noEntryFound">No translation found</p>
      <div id="spellSug">
        <a href="test">test</a>
      </div>
    </div>
  </div>
`;

describe("translateWord", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    browserMock.cookiesSet.mockReset();
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

  it("returns the direct not-found page when both direct and inverted lookups have no result", async () => {
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
          text: async () => htmlWithoutResult,
        }),
    );

    const result = await translateWord({
      dict1: "en",
      dict2: "it",
      word: "tets",
    });

    expect(result.ok).toBe(true);
    expect(result.meta.resolvedDict1).toBe("en");
    expect(result.meta.resolvedDict2).toBe("it");
    expect(result.meta.sourceUrl).toContain("/enit/tets");
    expect(result.html).toContain("noTransFound");
  });

  it("treats a 404 not-found page as a usable fallback result", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => htmlWithoutResult,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => htmlWithoutResult,
        }),
    );

    const result = await translateWord({
      dict1: "en",
      dict2: "it",
      word: "tets",
    });

    expect(result.ok).toBe(true);
    expect(result.meta.resolvedDict1).toBe("en");
    expect(result.meta.sourceUrl).toContain("/enit/tets");
    expect(result.html).toContain("noTransFound");
  });

  it("sets the WordReference challenge cookie and retries one 418 response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 418,
        text: async () =>
          '<script>document.cookie = "nginx_wr_human=1; Path=/; Domain=wordreference.com;"; window.location.reload();</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => htmlWithResult,
      });

    browserMock.cookiesSet.mockResolvedValue({
      name: "nginx_wr_human",
      value: "1",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await translateWord({
      dict1: "en",
      dict2: "it",
      word: "hello",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://www.wordreference.com/enit/hello",
      {
        method: "GET",
        credentials: "include",
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://www.wordreference.com/enit/hello",
      {
        method: "GET",
        credentials: "include",
      },
    );
    expect(browserMock.cookiesSet).toHaveBeenCalledWith({
      url: "https://www.wordreference.com/",
      name: "nginx_wr_human",
      value: "1",
      path: "/",
    });
  });

  it("reports an explicit error when the WordReference challenge cannot be completed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 418,
        text: async () =>
          '<script>document.cookie = "nginx_wr_human=1; Path=/; Domain=wordreference.com;"; window.location.reload();</script>',
      }),
    );
    browserMock.cookiesSet.mockResolvedValue(null);

    await expect(
      translateWord({
        dict1: "en",
        dict2: "it",
        word: "hello",
      }),
    ).rejects.toThrow("WordReference challenge could not be completed: 418");
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

  it("returns the first not-found page for auto-detect when no candidate resolves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => htmlWithoutResult,
      }),
    );

    const result = await translateWord({
      dict1: "auto",
      dict2: "it",
      word: "tets",
    });

    expect(result.ok).toBe(true);
    expect(result.meta.resolvedDict1).toBe("en");
    expect(result.meta.resolvedDict2).toBe("it");
    expect(result.meta.sourceUrl).toContain("/enit/tets");
    expect(result.html).toContain("noTransFound");
  });

  it("rejects invalid user input", async () => {
    await expect(
      translateWord({ dict1: "en", dict2: "it", word: "<script>" }),
    ).rejects.toThrow("Invalid text");
  });
});
