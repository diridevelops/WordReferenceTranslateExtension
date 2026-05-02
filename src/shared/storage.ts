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
  const settings = await getSettings();
  await setSettings(settings);
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
  const state = await getUiState();
  await browser.storage.local.set({ [UI_STATE_KEY]: state });
  return state;
}
