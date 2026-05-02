import { resolveInteractiveLookup } from "@/core/selection";
import { msg } from "@/shared/i18n";
import type { TranslationMeta, TranslationResult } from "@/shared/types";
import {
  buildAudioSourcesFromPaths,
  extractAudioPathsFromHtml,
  mergeVerbalFormLists,
  sanitizeWordReferenceRoot,
  toAbsoluteWordReferenceUrl,
} from "@/shared/wordreference-html";

function setupAudioWidget(listenWidget: HTMLElement | null, audioPaths: string[]): void {
  if (!listenWidget || audioPaths.length === 0) {
    return;
  }

  const audioFiles = document.createElement("div");
  audioFiles.id = "audio_files";

  audioPaths.forEach((path, index) => {
    const audio = document.createElement("audio");
    audio.id = `aud${index}`;
    const source = document.createElement("source");
    source.src = toAbsoluteWordReferenceUrl(path);
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

  audioPaths.forEach((path, index) => {
    const option = document.createElement("option");
    const absoluteUrl = toAbsoluteWordReferenceUrl(path);
    const chunks = absoluteUrl.split("/");
    const label =
      `${chunks[chunks.length - 3]}-${chunks[chunks.length - 2]}`.toUpperCase();
    option.value = String(index);
    option.title = label;
    option.textContent = label;
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

function buildLegacyResult(
  html: string,
  meta: TranslationMeta,
): { nodes: Node[]; result: TranslationResult } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const centerColumn = doc.querySelector<HTMLElement>("#centercolumn");
  const article = doc.querySelector<HTMLElement>("#articleWRD");
  if (!centerColumn || !article) {
    throw new Error("Unexpected WordReference response format");
  }

  sanitizeWordReferenceRoot(centerColumn);

  const listenWidget = doc.querySelector<HTMLElement>("#listen_widget");
  const audioPaths = extractAudioPathsFromHtml(html);
  setupAudioWidget(listenWidget, audioPaths);

  const tooltips = centerColumn.querySelectorAll<HTMLElement>(".tooltip");
  tooltips.forEach((tooltip) => {
    const arrow = document.createElement("span");
    arrow.className = "tooltipArrow";
    tooltip.append(arrow);
  });

  const pronWidget = doc.querySelector<HTMLInputElement>("#pronWgt");
  pronWidget?.addEventListener("change", () => {
    const target = pronWidget
      .closest("#pronunciation_widget")
      ?.querySelector<HTMLElement>(".more-pron-target");
    if (target) {
      target.style.display = pronWidget.checked ? "block" : "none";
    }
  });

  const headword =
    doc.querySelector(".headerWord")?.textContent?.trim() ?? meta.queriedWord;
  const pronunciationHtml =
    doc.querySelector("#pronunciation_widget")?.outerHTML ?? "";
  const inflectionNodes = mergeVerbalFormLists(
    doc.querySelector<HTMLElement>("#articleHead"),
  );
  const inflectionsHtml = inflectionNodes.map((node) => node.outerHTML).join("");
  const bodyHtml = article.outerHTML;
  const linksHtml = doc.querySelector("#WHlinks")?.outerHTML ?? "";

  const header = document.createElement("header");
  header.id = "WRText-articleHead";

  const headerWord = document.createElement("div");
  headerWord.id = "headerWord";
  headerWord.textContent = headword;
  header.append(headerWord);

  if (listenWidget) {
    header.append(listenWidget);
  }

  const sourceButton = document.createElement("div");
  sourceButton.className = "WRText-button";
  sourceButton.innerHTML = `<a id="WRText-sourceLink" href="${meta.sourceUrl}" target="_blank" rel="noopener noreferrer" title="${msg("popSourceBtn", "Open in WordReference.com")}"></a><span class="WRText-buttonLab">${msg("popSourceBtn", "Open in WordReference.com")}</span>`;
  header.append(sourceButton);

  const linksAnchor = document.createElement("a");
  linksAnchor.id = "WHlink";
  linksAnchor.href = "#WHlinks";
  linksAnchor.textContent = "[links]";
  header.append(linksAnchor);

  const pronunciationWidget = doc.querySelector("#pronunciation_widget");
  if (pronunciationWidget) {
    header.append(pronunciationWidget);
  }

  inflectionNodes.forEach((node) => header.append(node));

  const linksNode = doc.querySelector("#WHlinks");

  return {
    nodes: linksNode ? [header, article, linksNode] : [header, article],
    result: {
      ...meta,
      headword,
      pronunciationHtml,
      inflectionsHtml,
      bodyHtml,
      linksHtml,
      audioSources: buildAudioSourcesFromPaths(audioPaths),
    },
  };
}

export interface LegacyPopupHandlers {
  onLookupWord: (params: {
    word: string;
    dict1: TranslationResult["resolvedDict1"];
    dict2: TranslationResult["resolvedDict2"];
  }) => void | Promise<void>;
}

export function renderLegacyPopupResult(
  container: HTMLElement,
  html: string,
  meta: TranslationMeta,
  handlers: LegacyPopupHandlers,
): void {
  const { nodes, result } = buildLegacyResult(html, meta);
  container.innerHTML = "";
  container.append(...nodes);

  const article = container.querySelector<HTMLElement>("#articleWRD");
  const ownerDocument = container.ownerDocument;
  article?.addEventListener("click", (event) => {
    const lookup = resolveInteractiveLookup(ownerDocument, event.target, result);
    if (lookup) {
      void handlers.onLookupWord(lookup);
    }
  });
}
