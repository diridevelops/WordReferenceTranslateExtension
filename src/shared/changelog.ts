import type { Browser } from "wxt/browser";
import type { UiState } from "./types";

export function hasChangelogItems(items: readonly string[]): boolean {
  return items.length > 0;
}

export function shouldShowChangelogBadge(
  uiState: UiState,
  items: readonly string[],
): boolean {
  return Boolean(uiState.pendingChangelogVersion) && hasChangelogItems(items);
}

export function shouldQueueChangelogForInstall(
  details: Browser.runtime.InstalledDetails,
  items: readonly string[],
): boolean {
  return (
    hasChangelogItems(items) &&
    (details.reason === "install" || details.reason === "update")
  );
}
