import { browser } from "wxt/browser";
import { PAGE_ACCESS_ORIGINS } from "./constants";

export async function hasPageAccess(): Promise<boolean> {
  return browser.permissions.contains({ origins: [...PAGE_ACCESS_ORIGINS] });
}

export async function requestPageAccess(): Promise<boolean> {
  return browser.permissions.request({ origins: [...PAGE_ACCESS_ORIGINS] });
}
