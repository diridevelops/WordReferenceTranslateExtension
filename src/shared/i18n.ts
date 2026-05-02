import { browser } from "wxt/browser";

export function msg(
  key: string,
  fallback = "",
  substitutions?: string | string[],
): string {
  const api = browser.i18n as unknown as {
    getMessage(messageName: string, substitution?: string | string[]): string;
  };
  const value = api.getMessage(key, substitutions);
  return value || fallback;
}
