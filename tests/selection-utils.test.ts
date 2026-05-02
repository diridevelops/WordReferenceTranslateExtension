import { describe, expect, it } from "vitest";
import { getSelectedWord, isIgnoredTarget, shortcutMatches } from "@/entrypoints/selection.content/selection-utils";

describe("selection content helpers", () => {
  it("matches keyboard shortcuts using modifier flags and a primary key", () => {
    const event = new KeyboardEvent("keydown", {
      code: "KeyT",
      altKey: true,
      ctrlKey: true,
    });

    expect(
      shortcutMatches(event, {
        codes: ["ControlLeft", "AltLeft", "KeyT"],
        keys: ["Ctrl", "Alt", "T"],
      }),
    ).toBe(true);
  });

  it("ignores clicks inside editors and extension popup roots", () => {
    const editor = document.createElement("div");
    editor.className = "CodeMirror";
    expect(isIgnoredTarget(editor)).toBe(true);

    const popup = document.createElement("div");
    popup.className = "wrt-inline-popup";
    const child = document.createElement("span");
    popup.append(child);
    document.body.append(popup);

    expect(isIgnoredTarget(child)).toBe(true);
  });

  it("trims the active selection text", () => {
    const range = document.createRange();
    const textNode = document.createTextNode("  hello world  ");
    document.body.append(textNode);
    range.selectNodeContents(textNode);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(getSelectedWord()).toBe("hello world");
  });
});
