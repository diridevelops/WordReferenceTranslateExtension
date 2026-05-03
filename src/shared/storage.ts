import { browser } from "wxt/browser";
import {
  DEFAULT_SETTINGS,
  DEFAULT_UI_STATE,
  SETTINGS_KEY,
  UI_STATE_KEY,
} from "./constants";
import type { Settings, UiState } from "./types";

function mergeSettings(raw?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    version: 2,
  };
}

function mergeUiState(raw?: Partial<UiState>): UiState {
  return {
    ...DEFAULT_UI_STATE,
    ...raw,
  };
}

export async function getSettings(): Promise<Settings> {
  const data = await browser.storage.sync.get(SETTINGS_KEY);
  return mergeSettings(data[SETTINGS_KEY] as Partial<Settings> | undefined);
}

export async function setSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const next = mergeSettings({ ...current, ...partial });
  await setSettings(next);
  return next;
}

export async function ensureSettings(): Promise<Settings> {
  const data = await browser.storage.sync.get(SETTINGS_KEY);
  const raw = data[SETTINGS_KEY] as Partial<Settings> | undefined;
  const settings = mergeSettings(raw);

  if (
    !raw ||
    raw.version !== 2 ||
    raw.defaultLang === undefined ||
    raw.lastLang === undefined ||
    raw.popupAutocomplete === undefined ||
    raw.dict1 === undefined ||
    raw.dict2 === undefined ||
    raw.translContext === undefined ||
    raw.translISPopup === undefined ||
    raw.translISPopupIcon === undefined ||
    raw.translISPopupComb === undefined ||
    raw.translISKeyboardInput === undefined ||
    raw.themeSel === undefined ||
    raw.fontSize === undefined
  ) {
    await setSettings(settings);
  }

  return settings;
}

export async function getUiState(): Promise<UiState> {
  const data = await browser.storage.local.get(UI_STATE_KEY);
  return mergeUiState(data[UI_STATE_KEY] as Partial<UiState> | undefined);
}

export async function updateUiState(
  partial: Partial<UiState>,
): Promise<UiState> {
  const current = await getUiState();
  const next = mergeUiState({ ...current, ...partial });
  await browser.storage.local.set({ [UI_STATE_KEY]: next });
  return next;
}

export async function ensureUiState(): Promise<UiState> {
  const data = await browser.storage.local.get(UI_STATE_KEY);
  const raw = data[UI_STATE_KEY] as Partial<UiState> | undefined;
  const state = mergeUiState(raw);

  if (
    !raw ||
    raw.changelogViewedVersion === undefined ||
    raw.pendingChangelogVersion === undefined
  ) {
    await browser.storage.local.set({ [UI_STATE_KEY]: state });
  }

  return state;
}
