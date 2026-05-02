import { resolveInteractiveLookup } from "@/core/selection";
import { msg } from "@/shared/i18n";
import type {
  AudioSource,
  LanguageCode,
  TranslationFoundResult,
  TranslationResult,
} from "@/shared/types";

function parseFirstElement(
  document: Document,
  html: string,
): HTMLElement | null {
  if (!html) {
    return null;
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement | null;
}

function parseElements(
  document: Document,
  html: string,
): HTMLElement[] {
  if (!html) {
    return [];
  }

  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return [...template.content.children] as HTMLElement[];
}

function setupAudioWidget(
  listenWidget: HTMLElement | null,
  audioSources: AudioSource[],
): void {
  if (!listenWidget || audioSources.length === 0) {
    return;
  }

  const audioFiles = document.createElement("div");
  audioFiles.id = "audio_files";

  audioSources.forEach((audioSource, index) => {
    const audio = document.createElement("audio");
    audio.id = `aud${index}`;
    const source = document.createElement("source");
    source.src = audioSource.url;
    source.type = "audio/mpeg";
    audio.append(source);
    audioFiles.append(audio);
  });

  listenWidget.prepend(audioFiles);

  const accentSelection = listenWidget.querySelector<HTMLSelectElement>("#accentSelection");
  const listenText = listenWidget.querySelector<HTMLElement>("#listen_txt");
  if (!accentSelection || !listenText) {
    return;
  }

  listenText.removeAttribute("style");
  listenText.style.display = "inline";

  const optGroup = document.createElement("optgroup");
  optGroup.label = "Accents";

  audioSources.forEach((audioSource, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.title = audioSource.label;
    option.textContent = audioSource.label;
    optGroup.append(option);
  });

  accentSelection.append(optGroup);
  accentSelection.addEventListener("change", () => {
    listenText.click();
  });

  listenText.addEventListener("click", () => {
    const selected = accentSelection.selectedOptions[0]?.value ?? "0";
    const audio = listenWidget.querySelector<HTMLAudioElement>(
      `#audio_files > audio#aud${selected}`,
    );
    if (audio) {
      void audio.play();
    }
  });
}

function enhanceFoundMarkup(container: HTMLElement, result: TranslationFoundResult): void {
  const listenWidget = container.querySelector<HTMLElement>("#listen_widget");
  setupAudioWidget(listenWidget, result.audioSources);

  const tooltips = container.querySelectorAll<HTMLElement>(".tooltip");
  tooltips.forEach((tooltip) => {
    if (tooltip.querySelector(".tooltipArrow")) {
      return;
    }

    const arrow = document.createElement("span");
    arrow.className = "tooltipArrow";
    tooltip.append(arrow);
  });

  const pronWidget = container.querySelector<HTMLInputElement>("#pronWgt");
  pronWidget?.addEventListener("change", () => {
    const target = pronWidget
      .closest("#pronunciation_widget")
      ?.querySelector<HTMLElement>(".more-pron-target");
    if (target) {
      target.style.display = pronWidget.checked ? "block" : "none";
    }
  });
}

function renderFoundResult(
  container: HTMLElement,
  result: TranslationFoundResult,
  handlers: LegacyPopupHandlers,
): void {
  const ownerDocument = container.ownerDocument;
  const header = ownerDocument.createElement("header");
  header.id = "WRText-articleHead";

  const headerWord = ownerDocument.createElement("div");
  headerWord.id = "headerWord";
  headerWord.textContent = result.headword;
  header.append(headerWord);

  const listenWidget = parseFirstElement(ownerDocument, result.listenWidgetHtml);
  if (listenWidget) {
    header.append(listenWidget);
  }

  const sourceButton = ownerDocument.createElement("div");
  sourceButton.className = "WRText-button";
  sourceButton.innerHTML = `<a id="WRText-sourceLink" href="${result.sourceUrl}" target="_blank" rel="noopener noreferrer" title="${msg("popSourceBtn", "Open in WordReference.com")}"></a><span class="WRText-buttonLab">${msg("popSourceBtn", "Open in WordReference.com")}</span>`;
  header.append(sourceButton);

  const linksAnchor = ownerDocument.createElement("a");
  linksAnchor.id = "WHlink";
  linksAnchor.href = "#WHlinks";
  linksAnchor.textContent = "[links]";
  header.append(linksAnchor);

  const pronunciationWidget = parseFirstElement(
    ownerDocument,
    result.pronunciationHtml,
  );
  if (pronunciationWidget) {
    header.append(pronunciationWidget);
  }

  parseElements(ownerDocument, result.inflectionsHtml).forEach((node) =>
    header.append(node),
  );

  const article = parseFirstElement(ownerDocument, result.bodyHtml);
  const linksNode = parseFirstElement(ownerDocument, result.linksHtml);

  container.innerHTML = "";
  container.append(header);
  if (article) {
    container.append(article);
  }
  if (linksNode) {
    container.append(linksNode);
  }

  enhanceFoundMarkup(container, result);

  article?.addEventListener("click", (event) => {
    const lookup = resolveInteractiveLookup(ownerDocument, event.target, result);
    if (lookup) {
      void handlers.onLookupWord(lookup);
    }
  });
}

function renderNotFoundResult(
  container: HTMLElement,
  result: Extract<TranslationResult, { status: "not_found" }>,
  handlers: LegacyPopupHandlers,
): void {
  const ownerDocument = container.ownerDocument;
  const card = ownerDocument.createElement("section");
  card.id = "WRText-notFound";

  const title = ownerDocument.createElement("h2");
  title.id = "WRText-notFoundTitle";
  title.textContent =
    result.message || msg("popNoTranslationTitle", "No translation found");
  card.append(title);

  if (!result.message) {
    const message = ownerDocument.createElement("p");
    message.id = "WRText-notFoundMessage";
    message.textContent = msg(
      "popNoTranslationMessage",
      "Try one of these similar words instead.",
    );
    card.append(message);
  }

  if (result.similarWords.length > 0) {
    const suggestionsTitle = ownerDocument.createElement("div");
    suggestionsTitle.id = "WRText-notFoundSuggestionsTitle";
    suggestionsTitle.textContent = msg("popSimilarWordsLabel", "Similar words");
    card.append(suggestionsTitle);

    const suggestions = ownerDocument.createElement("div");
    suggestions.id = "WRText-notFoundSuggestions";

    result.similarWords.forEach((similarWord) => {
      const button = ownerDocument.createElement("button");
      button.type = "button";
      button.className = "WRText-notFoundSuggestion";
      button.textContent = similarWord.word;
      button.addEventListener("click", () => {
        void handlers.onLookupWord({
          word: similarWord.word,
          dict1: result.requestedDict1,
          dict2: result.requestedDict2,
        });
      });
      suggestions.append(button);
    });

    card.append(suggestions);
  }

  container.innerHTML = "";
  container.append(card);
}

export interface LegacyPopupHandlers {
  onLookupWord: (params: {
    word: string;
    dict1: LanguageCode;
    dict2: Exclude<LanguageCode, "auto">;
  }) => void | Promise<void>;
}

export function renderLegacyPopupResult(
  container: HTMLElement,
  result: TranslationResult,
  handlers: LegacyPopupHandlers,
): void {
  if (result.status === "not_found") {
    renderNotFoundResult(container, result, handlers);
    return;
  }

  renderFoundResult(container, result, handlers);
}
