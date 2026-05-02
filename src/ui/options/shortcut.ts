import { msg } from "@/shared/i18n";
import type { KeyboardShortcut } from "@/shared/types";

export const MODIFIER_OPTIONS = [
  { code: "ControlLeft", label: "Ctrl" },
  { code: "AltLeft", label: "Alt" },
  { code: "ShiftLeft", label: "Shift" },
  { code: "MetaLeft", label: "Meta" },
] as const;

export const PRIMARY_KEY_OPTIONS = [
  ...Array.from({ length: 26 }, (_, index) => {
    const letter = String.fromCharCode(65 + index);
    return { code: `Key${letter}`, label: letter };
  }),
  ...Array.from({ length: 10 }, (_, index) => ({
    code: `Digit${index}`,
    label: String(index),
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    code: `F${index + 1}`,
    label: `F${index + 1}`,
  })),
  { code: "Space", label: "Space" },
  { code: "Enter", label: "Enter" },
  { code: "Tab", label: "Tab" },
  { code: "Backspace", label: "Backspace" },
] as const;

export function formatShortcut(shortcut: KeyboardShortcut | null): string {
  if (!shortcut || shortcut.keys.length === 0) {
    return msg("translISKeyboardInputText", "Click to modify");
  }

  return shortcut.keys.join(" + ");
}

export function getShortcutParts(shortcut: KeyboardShortcut | null): {
  modifiers: string[];
  primaryCode: string;
} {
  if (!shortcut) {
    return { modifiers: [], primaryCode: "" };
  }

  const modifiers = shortcut.codes.filter((code) =>
    MODIFIER_OPTIONS.some((option) => option.code === code),
  );
  const primaryCode =
    shortcut.codes.find(
      (code) => !MODIFIER_OPTIONS.some((option) => option.code === code),
    ) ?? "";

  return { modifiers, primaryCode };
}

export function buildShortcut(
  modifiers: string[],
  primaryCode: string,
): KeyboardShortcut | null {
  const maxModifiers = primaryCode ? 2 : 3;
  const uniqueModifiers = MODIFIER_OPTIONS.filter((option) =>
    modifiers.includes(option.code),
  ).slice(0, maxModifiers);
  const primary = PRIMARY_KEY_OPTIONS.find((option) => option.code === primaryCode);
  const codes: string[] = [...uniqueModifiers.map((option) => option.code)];
  const keys: string[] = [...uniqueModifiers.map((option) => option.label)];

  if (primary) {
    codes.push(primary.code);
    keys.push(primary.label);
  }

  return codes.length > 0 ? { codes, keys } : null;
}
