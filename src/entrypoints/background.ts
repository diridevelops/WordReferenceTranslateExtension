import { browser, type Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  CHANGELOG_ITEMS,
  CONTENT_SCRIPT_ID,
  EXTENSION_VERSION,
  PAGE_ACCESS_ORIGINS,
} from "@/shared/constants";
import {
  shouldQueueChangelogForInstall,
  shouldShowChangelogBadge,
} from "@/shared/changelog";
import { msg } from "@/shared/i18n";
import { hasPageAccess } from "@/shared/permissions";
import {
  ensureSettings,
  ensureUiState,
  getSettings,
  updateUiState,
} from "@/shared/storage";
import type { RuntimeMessage } from "@/shared/types";
import { translateWord } from "@/core/wordreference";

let contentScriptSyncChain: Promise<void> = Promise.resolve();

async function syncBadge(): Promise<void> {
  const uiState = await ensureUiState();
  const needsBadge = shouldShowChangelogBadge(uiState, CHANGELOG_ITEMS);
  await browser.action.setBadgeText({ text: needsBadge ? "!" : "" });
  if (needsBadge) {
    await browser.action.setBadgeBackgroundColor({ color: "firebrick" });
  }
}

async function syncContextMenu(): Promise<void> {
  const settings = await getSettings();
  await browser.contextMenus.removeAll();

  if (!settings.translContext) {
    return;
  }

  await browser.contextMenus.create({
    id: "translate-selection",
    title: msg("menuItemSelectionLogger", "Translate '%s'"),
    contexts: ["selection"],
  });
}

async function syncContentScriptRegistrationNow(): Promise<void> {
  const settings = await getSettings();
  const shouldEnable =
    settings.translContext ||
    settings.translISPopup ||
    settings.translISPopupIcon ||
    settings.translISPopupComb;

  await browser.scripting
    .unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] })
    .catch(() => {
      return undefined;
    });

  if (!shouldEnable || !(await hasPageAccess())) {
    return;
  }

  await browser.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content-scripts/selection.js"],
      css: ["content-scripts/selection.css"],
      matches: [...PAGE_ACCESS_ORIGINS],
      runAt: "document_idle",
      persistAcrossSessions: true,
    },
  ]);
}

function syncContentScriptRegistration(): Promise<void> {
  const run = async (): Promise<void> => {
    await syncContentScriptRegistrationNow();
  };

  const next = contentScriptSyncChain.then(run, run);
  contentScriptSyncChain = next.catch(() => undefined);
  return next;
}

async function initializeExtension(): Promise<void> {
  await ensureSettings();
  await ensureUiState();
  await syncBadge();
  await syncContextMenu();
  await syncContentScriptRegistration();
}

async function handleInstalled(
  details: Browser.runtime.InstalledDetails,
): Promise<void> {
  await ensureSettings();
  await ensureUiState();

  if (shouldQueueChangelogForInstall(details, CHANGELOG_ITEMS)) {
    await updateUiState({
      pendingChangelogVersion: EXTENSION_VERSION,
    });
  }

  await syncBadge();
  await syncContextMenu();
  await syncContentScriptRegistration();
}

export default defineBackground(() => {
  void initializeExtension();

  browser.runtime.onInstalled.addListener((details) => {
    void handleInstalled(details);
  });

  browser.runtime.onStartup.addListener(() => {
    void initializeExtension();
  });

  browser.storage.onChanged.addListener(
    (
      changes: Record<string, Browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "sync" && changes.settings) {
        void syncContextMenu();
        void syncContentScriptRegistration();
      }

      if (areaName === "local" && changes.uiState) {
        void syncBadge();
      }
    },
  );

  browser.permissions.onAdded.addListener(() => {
    void syncContentScriptRegistration();
  });

  browser.permissions.onRemoved.addListener(() => {
    void syncContentScriptRegistration();
  });

  browser.contextMenus.onClicked.addListener(
    (info: Browser.contextMenus.OnClickData, tab?: Browser.tabs.Tab) => {
      if (
        info.menuItemId !== "translate-selection" ||
        !tab?.id ||
        !info.selectionText
      ) {
        return;
      }

      void browser.tabs.sendMessage(tab.id, {
        type: "OPEN_SELECTION",
        payload: { selectedText: info.selectionText },
      } satisfies RuntimeMessage);
    },
  );

  browser.runtime.onMessage.addListener(
    (
      message: RuntimeMessage,
      _sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (message.type !== "TRANSLATE") {
        return false;
      }

      void (async () => {
        try {
          const response = await translateWord(message.payload);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            ok: false,
            error:
              error instanceof Error
                ? `${msg("popError", "Something went wrong.")}\n${error.message}`
                : msg("popError", "Something went wrong."),
          });
        }
      })();

      return true;
    },
  );
});
