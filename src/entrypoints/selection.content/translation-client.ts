import { sendRuntimeMessage } from "@/shared/messages";
import { msg } from "@/shared/i18n";
import type { Settings, TranslationMessageResponse } from "@/shared/types";

export async function requestSelectionTranslation(
  word: string,
  settings: Settings | null,
  dict1 = settings?.dict1,
  dict2 = settings?.dict2,
): Promise<TranslationMessageResponse> {
  if (!dict1 || !dict2) {
    throw new Error(
      msg("optTranslISPopupErrorLang", "No languages selected."),
    );
  }

  return sendRuntimeMessage<TranslationMessageResponse>({
    type: "TRANSLATE",
    payload: { dict1, dict2, word },
  });
}
