import { browser, type Browser } from "wxt/browser";
import { getSettings } from "@/shared/storage";
import type {
  InPagePopupMessage,
  RuntimeMessage,
  Settings,
} from "@/shared/types";
import { msg } from "@/shared/i18n";
import { getSelectionRect, getSelectedWord, isIgnoredTarget, shortcutMatches } from "./selection-utils";
import { InPagePopupView } from "./popup-view";
import { requestSelectionTranslation } from "./translation-client";

export class InPageController {
  private settings: Settings | null = null;
  private lastSelectionRect = getSelectionRect();
  private readonly popupView = new InPagePopupView();

  async init(): Promise<void> {
    this.settings = await getSettings();

    browser.storage.onChanged.addListener(this.handleStorageChange);
    browser.runtime.onMessage.addListener(this.handleRuntimeMessage);

    document.addEventListener("mouseup", this.handleMouseUp, true);
    document.addEventListener("mousedown", this.handleMouseDown, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("message", this.handleFrameMessage);
  }

  private readonly handleStorageChange = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName === "sync" && changes.settings) {
      this.settings = changes.settings.newValue as Settings;
      this.applyTheme();
    }
  };

  private readonly handleRuntimeMessage = (message: RuntimeMessage): void => {
    if (message.type === "OPEN_SELECTION") {
      this.lastSelectionRect = getSelectionRect();
      void this.openPopup(message.payload.selectedText.trim());
    }
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (!this.settings || event.button !== 0 || isIgnoredTarget(event.target)) {
      return;
    }

    const selectedWord = getSelectedWord();
    this.lastSelectionRect = getSelectionRect();

    if (!selectedWord) {
      this.popupView.removeIcon();
      return;
    }

    if (this.settings.translISPopup && event.altKey) {
      event.stopPropagation();
      void this.openPopup(selectedWord);
      return;
    }

    if (this.settings.translISPopupIcon) {
      event.stopPropagation();
      this.popupView.showIcon(selectedWord, this.lastSelectionRect, (word) => {
        void this.openPopup(word);
      });
    }
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    const target = event.target;
    if (
      this.popupView.popupElement &&
      target instanceof Node &&
      !this.popupView.popupElement.contains(target) &&
      !this.popupView.iconElement?.contains(target)
    ) {
      this.popupView.closePopup();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      !this.settings ||
      !this.settings.translISPopupComb ||
      isIgnoredTarget(event.target)
    ) {
      return;
    }

    const selectedWord = getSelectedWord();
    if (
      !selectedWord ||
      !shortcutMatches(event, this.settings.translISKeyboardInput)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.lastSelectionRect = getSelectionRect();
    this.popupView.removeIcon();
    void this.openPopup(selectedWord);
  };

  private readonly handleFrameMessage = (event: MessageEvent): void => {
    if (event.source !== this.popupView.iframeWindow) {
      return;
    }

    const data = event.data as InPagePopupMessage | undefined;
    if (!data) {
      return;
    }

    if (data.type === "WRT_READY") {
      this.popupView.markFrameReady();
      return;
    }

    if (data.type === "WRT_LOOKUP") {
      void this.openPopup(
        data.payload.word,
        data.payload.dict1,
        data.payload.dict2,
      );
    }
  };

  private applyTheme(): void {
    if (!this.settings) {
      return;
    }

    this.popupView.updateStyle(this.settings.themeSel, this.settings.fontSize);
  }

  async openPopup(
    word: string,
    dict1 = this.settings?.dict1,
    dict2 = this.settings?.dict2,
  ): Promise<void> {
    if (!this.settings) {
      return;
    }

    this.popupView.ensurePopup(this.settings.themeSel);
    this.popupView.removeIcon();
    this.popupView.setLoading(this.settings.themeSel, this.settings.fontSize);
    this.popupView.positionPopup(this.lastSelectionRect);

    try {
      const response = await requestSelectionTranslation(
        word,
        this.settings,
        dict1,
        dict2,
      );
      if (!response.ok) {
        throw new Error(response.error);
      }

      this.popupView.setRender(
        response,
        this.settings.themeSel,
        this.settings.fontSize,
      );
      this.popupView.positionPopup(this.lastSelectionRect);
    } catch (error) {
      this.popupView.setError(
        error instanceof Error
          ? error.message
          : msg("popError", "Something went wrong."),
        this.settings.themeSel,
        this.settings.fontSize,
      );
    }
  }
}
