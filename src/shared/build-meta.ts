declare const __WRT_EXTENSION_AUTHOR_NAME__: string;
declare const __WRT_EXTENSION_AUTHOR_EMAIL__: string;
declare const __WRT_EXTENSION_AUTHOR_WEBSITE__: string;
declare const __WRT_EXTENSION_REPO_URL__: string;
declare const __WRT_CHANGELOG_ITEMS__: string[];

export const EXTENSION_AUTHOR_NAME =
  typeof __WRT_EXTENSION_AUTHOR_NAME__ !== "undefined"
    ? __WRT_EXTENSION_AUTHOR_NAME__
    : "";
export const EXTENSION_AUTHOR_EMAIL =
  typeof __WRT_EXTENSION_AUTHOR_EMAIL__ !== "undefined"
    ? __WRT_EXTENSION_AUTHOR_EMAIL__
    : "";
export const EXTENSION_AUTHOR_WEBSITE =
  typeof __WRT_EXTENSION_AUTHOR_WEBSITE__ !== "undefined"
    ? __WRT_EXTENSION_AUTHOR_WEBSITE__
    : "";
export const EXTENSION_REPO_URL =
  typeof __WRT_EXTENSION_REPO_URL__ !== "undefined"
    ? __WRT_EXTENSION_REPO_URL__
    : "";
export const CHANGELOG_ITEMS =
  typeof __WRT_CHANGELOG_ITEMS__ !== "undefined"
    ? __WRT_CHANGELOG_ITEMS__
    : [];
