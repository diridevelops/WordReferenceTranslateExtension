import { msg } from "@/shared/i18n";
import type {
  InPagePopupMessage,
  ThemeName,
  TranslationMessageResponse,
} from "@/shared/types";
import {
  INLINE_POPUP_HEIGHT,
  INLINE_POPUP_WIDTH,
  type SelectionRect,
} from "./constants";
import { getExtensionUrl } from "./selection-utils";

type PendingPopupMessage = Extract<
  InPagePopupMessage,
  { type: "WRT_LOADING" | "WRT_RENDER" | "WRT_STYLE" | "WRT_ERROR" }
>;

export class InPagePopupView {
  private popup: HTMLDivElement | null = null;
  private icon: HTMLButtonElement | null = null;
  private arrow: HTMLDivElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private frameReady = false;
  private pendingMessage: PendingPopupMessage | null = null;

  get popupElement(): HTMLDivElement | null {
    return this.popup;
  }

  get iconElement(): HTMLButtonElement | null {
    return this.icon;
  }

  get iframeWindow(): Window | null {
    return this.iframe?.contentWindow ?? null;
  }

  markFrameReady(): void {
    this.frameReady = true;
    this.flushPendingMessage();
  }

  ensurePopup(theme: ThemeName): void {
    if (this.popup && this.arrow && this.iframe) {
      return;
    }

    this.popup = document.createElement("div");
    this.popup.className = "wrt-inline-popup";

    this.arrow = document.createElement("div");
    this.arrow.className = "wrt-inline-popup__arrow";

    this.iframe = document.createElement("iframe");
    this.iframe.className = "wrt-inline-popup__frame";
    this.iframe.setAttribute("scrolling", "no");
    this.iframe.src = getExtensionUrl("/in-page-popup.html");

    this.popup.append(this.iframe);
    document.body.append(this.popup, this.arrow);
    this.applyTheme(theme);
  }

  showIcon(word: string, rect: SelectionRect, onClick: (word: string) => void): void {
    this.removeIcon();
    if (!rect) {
      return;
    }

    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "wrt-inline-icon";
    icon.setAttribute(
      "aria-label",
      msg("optTranslISPopupIconLab", "Translate selection"),
    );
    icon.style.left = `${window.scrollX + rect.right + 6}px`;
    icon.style.top = `${window.scrollY + rect.bottom + 4}px`;
    icon.style.backgroundImage = `url("${getExtensionUrl("/icons/icon/icon-32.png")}")`;
    icon.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    icon.addEventListener("mouseup", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    icon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.removeIcon();
      onClick(word);
    });

    document.body.append(icon);
    this.icon = icon;
  }

  removeIcon(): void {
    this.icon?.remove();
    this.icon = null;
  }

  closePopup(): void {
    this.popup?.remove();
    this.arrow?.remove();
    this.popup = null;
    this.arrow = null;
    this.iframe = null;
    this.frameReady = false;
    this.pendingMessage = null;
  }

  applyTheme(theme: ThemeName): void {
    if (!this.popup || !this.arrow) {
      return;
    }

    this.popup.dataset.theme = theme;
    this.arrow.dataset.theme = theme;
  }

  updateStyle(theme: ThemeName, fontSize: number): void {
    this.applyTheme(theme);
    this.pendingMessage = {
      type: "WRT_STYLE",
      payload: { theme, fontSize },
    };
    this.flushPendingMessage();
  }

  setLoading(theme: ThemeName, fontSize: number): void {
    this.pendingMessage = {
      type: "WRT_LOADING",
      payload: { theme, fontSize },
    };
    this.flushPendingMessage();
  }

  setRender(
    response: Extract<TranslationMessageResponse, { ok: true }>,
    theme: ThemeName,
    fontSize: number,
  ): void {
    this.pendingMessage = {
      type: "WRT_RENDER",
      payload: {
        html: response.html,
        meta: response.meta,
        theme,
        fontSize,
      },
    };
    this.flushPendingMessage();
  }

  setError(message: string, theme: ThemeName, fontSize: number): void {
    this.pendingMessage = {
      type: "WRT_ERROR",
      payload: { message, theme, fontSize },
    };
    this.flushPendingMessage();
  }

  positionPopup(rect: SelectionRect): void {
    if (!this.popup || !this.arrow) {
      return;
    }

    const margin = 8;
    let left =
      window.scrollX + (rect?.left ?? window.innerWidth / 2) - INLINE_POPUP_WIDTH / 2;
    let top =
      window.scrollY + (rect?.top ?? window.innerHeight / 2) - INLINE_POPUP_HEIGHT - 16;
    let onTop = true;

    if (left < window.scrollX + margin) {
      left = window.scrollX + margin;
    }
    if (left + INLINE_POPUP_WIDTH > window.scrollX + window.innerWidth - margin) {
      left = window.scrollX + window.innerWidth - INLINE_POPUP_WIDTH - margin;
    }
    if (top < window.scrollY + margin) {
      top = window.scrollY + (rect?.bottom ?? 0) + 16;
      onTop = false;
    }

    this.popup.style.left = `${left}px`;
    this.popup.style.top = `${top}px`;

    const arrowLeft =
      window.scrollX +
      (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
    this.arrow.style.left = `${arrowLeft}px`;
    this.arrow.style.top = onTop
      ? `${top + INLINE_POPUP_HEIGHT - 1}px`
      : `${top - 9}px`;
    this.arrow.dataset.position = onTop ? "bottom" : "top";
  }

  private flushPendingMessage(): void {
    if (!this.frameReady || !this.pendingMessage || !this.iframe?.contentWindow) {
      return;
    }

    this.iframe.contentWindow.postMessage(this.pendingMessage, "*");
    this.pendingMessage = null;
  }
}
