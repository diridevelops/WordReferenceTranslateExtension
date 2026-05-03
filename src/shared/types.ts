export type LanguageCode =
  | "auto"
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "gr"
  | "sv"
  | "nl"
  | "ru"
  | "pl"
  | "ro"
  | "cz"
  | "tr"
  | "ja"
  | "ko"
  | "zh";

export type ThemeName = "wordreference" | "darkula" | "midnight";

export interface KeyboardShortcut {
  codes: string[];
  keys: string[];
}

export interface Settings {
  version: 2;
  defaultLang: boolean;
  lastLang: boolean;
  popupAutocomplete: boolean;
  dict1: LanguageCode | null;
  dict2: Exclude<LanguageCode, "auto"> | null;
  translContext: boolean;
  translISPopup: boolean;
  translISPopupIcon: boolean;
  translISPopupComb: boolean;
  translISKeyboardInput: KeyboardShortcut | null;
  themeSel: ThemeName;
  fontSize: number;
}

export interface UiState {
  changelogViewedVersion: string | null;
  pendingChangelogVersion: string | null;
}

export interface SearchHistoryEntry {
  dict1: LanguageCode;
  dict2: Exclude<LanguageCode, "auto">;
  word: string;
}

export type AutocompleteLanguage = Extract<LanguageCode, "en" | "es" | "fr" | "it">;

export type AutocompleteDatasetEntry = [display: string, normalized: string, rank: number];

export interface AutocompleteDataset {
  language: AutocompleteLanguage;
  entries: AutocompleteDatasetEntry[];
  index: Record<string, [start: number, end: number]>;
}

export interface AutocompleteResult {
  display: string;
  normalized: string;
  language: AutocompleteLanguage;
  tag: string;
  rank: number;
}

export interface TranslationMeta {
  requestedDict1: LanguageCode;
  requestedDict2: Exclude<LanguageCode, "auto">;
  resolvedDict1: Exclude<LanguageCode, "auto">;
  resolvedDict2: Exclude<LanguageCode, "auto">;
  sourceUrl: string;
  queriedWord: string;
}

export interface AudioSource {
  label: string;
  url: string;
}

export interface SimilarWord {
  word: string;
  normalized: string;
}

export interface TranslationFoundResult extends TranslationMeta {
  status: "found";
  headword: string;
  listenWidgetHtml: string;
  pronunciationHtml: string;
  inflectionsHtml: string;
  bodyHtml: string;
  linksHtml: string;
  audioSources: AudioSource[];
}

export interface TranslationNotFoundResult extends TranslationMeta {
  status: "not_found";
  message: string;
  similarWords: SimilarWord[];
}

export type TranslationResult = TranslationFoundResult | TranslationNotFoundResult;

export interface TranslationRequest {
  dict1: LanguageCode;
  dict2: Exclude<LanguageCode, "auto">;
  word: string;
}

export interface TranslationResponse {
  ok: true;
  html: string;
  meta: TranslationMeta;
}

export interface TranslationErrorResponse {
  ok: false;
  error: string;
}

export type TranslationMessageResponse =
  | TranslationResponse
  | TranslationErrorResponse;

export interface TranslateMessage {
  type: "TRANSLATE";
  payload: TranslationRequest;
}

export interface OpenSelectionMessage {
  type: "OPEN_SELECTION";
  payload: {
    selectedText: string;
  };
}

export type RuntimeMessage = TranslateMessage | OpenSelectionMessage;

export interface InPagePopupRenderMessage {
  type: "WRT_RENDER";
  payload: {
    html: string;
    meta: TranslationMeta;
    theme: ThemeName;
    fontSize: number;
  };
}

export interface InPagePopupLoadingMessage {
  type: "WRT_LOADING";
  payload: {
    theme: ThemeName;
    fontSize: number;
  };
}

export interface InPagePopupLookupMessage {
  type: "WRT_LOOKUP";
  payload: {
    word: string;
    dict1: LanguageCode;
    dict2: Exclude<LanguageCode, "auto">;
  };
}

export interface InPagePopupStyleMessage {
  type: "WRT_STYLE";
  payload: {
    theme: ThemeName;
    fontSize: number;
  };
}

export interface InPagePopupErrorMessage {
  type: "WRT_ERROR";
  payload: {
    message: string;
    theme: ThemeName;
    fontSize: number;
  };
}

export interface InPagePopupReadyMessage {
  type: "WRT_READY";
}

export type InPagePopupMessage =
  | InPagePopupRenderMessage
  | InPagePopupLoadingMessage
  | InPagePopupLookupMessage
  | InPagePopupStyleMessage
  | InPagePopupErrorMessage
  | InPagePopupReadyMessage;
