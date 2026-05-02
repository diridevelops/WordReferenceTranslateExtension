import type { Settings, ThemeName, UiState } from "./types";
import { CHANGELOG_ITEMS } from "./build-meta";

export { CHANGELOG_ITEMS };

export const EXTENSION_VERSION = "3.0.0";
export const SETTINGS_KEY = "settings";
export const UI_STATE_KEY = "uiState";
export const CONTENT_SCRIPT_ID = "selection-content";
export const PAGE_ACCESS_ORIGINS = ["http://*/*", "https://*/*"] as const;
export const MAX_SEARCH_LENGTH = 200;

export const THEMES: ThemeName[] = ["wordreference", "darkula", "midnight"];

export const LANGUAGE_LABELS = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  gr: "Greek",
  sv: "Swedish",
  nl: "Dutch",
  ru: "Russian",
  pl: "Polish",
  ro: "Romanian",
  cz: "Czech",
  tr: "Turkish",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  defaultLang: false,
  lastLang: true,
  dict1: null,
  dict2: null,
  translContext: false,
  translISPopup: false,
  translISPopupIcon: false,
  translISPopupComb: false,
  translISKeyboardInput: null,
  themeSel: "wordreference",
  fontSize: 14,
};

export const DEFAULT_UI_STATE: UiState = {
  changelogViewedVersion: null,
  pendingChangelogVersion: null,
};
