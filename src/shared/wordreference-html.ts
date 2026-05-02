import type { AudioSource } from "./types";

const WORDREFERENCE_ROOT = "https://www.wordreference.com";
const TOOLTIP_MARKUP_RE = /\[(\w+)]([^[]*)\[\/\w+]/g;
const AUDIO_PATH_RE = /\/[^']*mp3/g;

function rewriteTooltipMarkup(html: string): string {
  return html.replace(TOOLTIP_MARKUP_RE, (_, tag: string, text: string) => {
    return `<${tag}>${text}</${tag}>`;
  });
}

export function toAbsoluteWordReferenceUrl(url: string): string {
  if (url.startsWith("/")) {
    return `${WORDREFERENCE_ROOT}${url}`;
  }

  return url;
}

export function sanitizeWordReferenceRoot(root: ParentNode): void {
  root.querySelectorAll("style, script, .wrcopyright").forEach((node) => {
    node.remove();
  });

  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) {
      return;
    }

    if (
      href.startsWith("/") ||
      href.startsWith("http://") ||
      href.startsWith("https://")
    ) {
      link.href = toAbsoluteWordReferenceUrl(href);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return;
    }

    if (!href.startsWith("#")) {
      link.removeAttribute("href");
    }
  });

  root.querySelectorAll<HTMLElement>("[src]").forEach((element) => {
    const src = element.getAttribute("src");
    if (!src) {
      return;
    }

    if (
      src.startsWith("/") ||
      src.startsWith("http://") ||
      src.startsWith("https://")
    ) {
      element.setAttribute("src", toAbsoluteWordReferenceUrl(src));
      return;
    }

    element.removeAttribute("src");
  });

  root.querySelectorAll<HTMLElement>(".tooltip span").forEach((tooltipText) => {
    tooltipText.innerHTML = rewriteTooltipMarkup(tooltipText.innerHTML);
  });
}

export function extractAudioPathsFromHtml(html: string): string[] {
  return html.match(AUDIO_PATH_RE) ?? [];
}

export function buildAudioSourcesFromPaths(paths: string[]): AudioSource[] {
  return paths.map((path) => {
    const absoluteUrl = toAbsoluteWordReferenceUrl(path);
    const segments = absoluteUrl.split("/");
    const label =
      `${segments[segments.length - 3]}-${segments[segments.length - 2]}`.toUpperCase();

    return {
      label,
      url: absoluteUrl,
    };
  });
}

export function mergeVerbalFormLists(
  articleHead: ParentNode | null,
): HTMLElement[] {
  if (!articleHead) {
    return [];
  }

  const allDls = [...articleHead.querySelectorAll<HTMLElement>("dl")];
  const regularLists = allDls.filter(
    (node) => !node.classList.contains("ListInfl"),
  );
  const verbalFormLists = allDls.filter((node) =>
    node.classList.contains("ListInfl"),
  );

  verbalFormLists.forEach((listNode, index) => {
    const target = regularLists[index]?.querySelectorAll("dd")[index];
    if (target) {
      target.append(listNode);
    }
  });

  return regularLists;
}
