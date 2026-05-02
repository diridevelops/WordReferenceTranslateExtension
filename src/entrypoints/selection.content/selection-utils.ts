import { browser } from "wxt/browser";
import type { KeyboardShortcut } from "@/shared/types";
import type { SelectionRect } from "./constants";

export function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.closest(".wrt-inline-icon, .wrt-inline-popup")) {
    return true;
  }

  const className = target.className?.toString() ?? "";
  const matchesEditor = /(cm-)|(CodeMirror)/.test(className);

  return Boolean(
    matchesEditor ||
      target.closest(
        "textarea, pre, [contenteditable='true'], [class*='cm-'], [class*='CodeMirror']",
      ),
  );
}

export function getSelectedWord(): string {
  return window.getSelection()?.toString().trim() ?? "";
}

export function shortcutMatches(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut | null,
): boolean {
  if (!shortcut || shortcut.codes.length === 0) {
    return false;
  }

  return shortcut.codes.every((code: string) => {
    switch (code) {
      case "AltLeft":
      case "AltRight":
        return event.altKey;
      case "ControlLeft":
      case "ControlRight":
        return event.ctrlKey;
      case "ShiftLeft":
      case "ShiftRight":
        return event.shiftKey;
      case "MetaLeft":
      case "MetaRight":
        return event.metaKey;
      default:
        return event.code === code;
    }
  });
}

export function getSelectionRect(): SelectionRect {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  return selection.getRangeAt(0).getBoundingClientRect();
}

export function getExtensionUrl(path: string): string {
  const runtime = browser.runtime as unknown as {
    getURL(resourcePath: string): string;
  };

  return runtime.getURL(path);
}
