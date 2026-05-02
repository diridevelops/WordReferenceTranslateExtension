import { describe, expect, it } from "vitest";
import type { Browser } from "wxt/browser";
import {
  hasChangelogItems,
  shouldQueueChangelogForInstall,
  shouldShowChangelogBadge,
} from "@/shared/changelog";
import type { UiState } from "@/shared/types";

const EMPTY_UI_STATE: UiState = {
  changelogViewedVersion: null,
  pendingChangelogVersion: null,
};

describe("changelog helpers", () => {
  function installedDetails(
    reason: string,
  ): Browser.runtime.InstalledDetails {
    return { reason } as unknown as Browser.runtime.InstalledDetails;
  }

  it("does not show the badge when changelog items are empty", () => {
    expect(
      shouldShowChangelogBadge(
        { ...EMPTY_UI_STATE, pendingChangelogVersion: "3.0.0" },
        [],
      ),
    ).toBe(false);
    expect(hasChangelogItems([])).toBe(false);
  });

  it("shows the badge only when a pending version exists", () => {
    expect(
      shouldShowChangelogBadge(
        { ...EMPTY_UI_STATE, pendingChangelogVersion: "3.0.0" },
        ["First public release"],
      ),
    ).toBe(true);
    expect(
      shouldShowChangelogBadge(EMPTY_UI_STATE, ["First public release"]),
    ).toBe(false);
  });

  it("queues changelog visibility only for extension install and update", () => {
    expect(
      shouldQueueChangelogForInstall(
        installedDetails("install"),
        ["First public release"],
      ),
    ).toBe(true);
    expect(
      shouldQueueChangelogForInstall(
        installedDetails("update"),
        ["First public release"],
      ),
    ).toBe(true);
    expect(
      shouldQueueChangelogForInstall(
        installedDetails("browser_update"),
        ["First public release"],
      ),
    ).toBe(false);
  });
});
