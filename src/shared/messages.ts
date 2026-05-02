import { browser } from "wxt/browser";
import type { RuntimeMessage, TranslationMessageResponse } from "./types";

export async function sendRuntimeMessage<T extends TranslationMessageResponse>(
  message: RuntimeMessage,
): Promise<T> {
  return (await browser.runtime.sendMessage(message)) as T;
}
