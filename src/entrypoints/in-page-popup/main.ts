import popupCss from "@/ui/styles/in-page/in-page-popup.css?inline";
import { parseTranslationHtml } from "@/core/parse";
import { renderLegacyPopupResult } from "@/shared/render-legacy-popup";
import type { InPagePopupMessage } from "@/shared/types";

const container = document.getElementById("WRText-content");

function renderLoader(target: HTMLElement): void {
  const loader = target.ownerDocument.createElement("div");
  loader.className = "WRTloader";
  target.replaceChildren(loader);
}

function injectStyles(): void {
  const legacyStyle = document.createElement("style");
  legacyStyle.textContent = popupCss;
  document.head.append(legacyStyle);
}

function postMessage(message: InPagePopupMessage): void {
  window.parent.postMessage(message, "*");
}

function applyTheme(theme: string, fontSize: number): void {
  document.documentElement.dataset.theme = theme;
  if (container) {
    container.style.fontSize = `${fontSize}px`;
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as InPagePopupMessage | undefined;
  if (!data || !container) {
    return;
  }

  if (data.type === "WRT_LOADING") {
    applyTheme(data.payload.theme, data.payload.fontSize);
    renderLoader(container);
    return;
  }

  if (data.type === "WRT_STYLE") {
    applyTheme(data.payload.theme, data.payload.fontSize);
    return;
  }

  if (data.type === "WRT_ERROR") {
    applyTheme(data.payload.theme, data.payload.fontSize);
    container.textContent = data.payload.message;
    return;
  }

  if (data.type === "WRT_RENDER") {
    applyTheme(data.payload.theme, data.payload.fontSize);
    try {
      const result = parseTranslationHtml(data.payload.html, data.payload.meta);
      renderLegacyPopupResult(container, result, {
        onLookupWord: ({ word, dict1, dict2 }) => {
          postMessage({
            type: "WRT_LOOKUP",
            payload: { word, dict1, dict2 },
          });
        },
      });
    } catch (error) {
      container.textContent =
        error instanceof Error ? error.message : "Something went wrong.";
    }
  }
});

injectStyles();
postMessage({ type: "WRT_READY" });
