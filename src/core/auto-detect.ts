import { LANGUAGE_LABELS } from "@/shared/constants";
import type { LanguageCode } from "@/shared/types";

export function getAutoDetectCandidateLanguages(
  target: Exclude<LanguageCode, "auto">,
): Exclude<LanguageCode, "auto">[] {
  return (Object.keys(LANGUAGE_LABELS) as Exclude<LanguageCode, "auto">[]).filter(
    (language) => language !== target,
  );
}
