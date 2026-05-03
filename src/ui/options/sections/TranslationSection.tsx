import { LANGUAGE_LABELS } from "@/shared/constants";
import { msg } from "@/shared/i18n";
import type { Settings } from "@/shared/types";
import { SelectField, ToggleField } from "../fields";

export function TranslationSection(props: {
  settings: Settings;
  onSave: (partial: Partial<Settings>) => Promise<void>;
}) {
  const { settings, onSave } = props;

  return (
    <section className="options-card">
      <div className="options-card__legend">
        <h2>{msg("optTranslManagement", "Translation")}</h2>
      </div>
      <div className="options-card__body">
        <ToggleField
          id="defaultLang"
          checked={settings.defaultLang}
          label={msg("optDefaultLangLab", "Use these languages as default")}
          help={msg(
            "optDefaultLangHelp",
            "Languages in the popup will be set by default to those selected here (you can even select only one)",
          )}
          onChange={async (checked) => {
            await onSave({ defaultLang: checked, lastLang: !checked });
          }}
        >
          <div className="options-inline-grid">
            <SelectField
              value={settings.dict1 ?? ""}
              onChange={(event) =>
                void onSave({ dict1: event.target.value as Settings["dict1"] })
              }
              disabled={!settings.defaultLang}
              title="From"
            >
              <option value="" disabled>
                From
              </option>
              <option value="auto">Auto detect</option>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={settings.dict2 ?? ""}
              onChange={(event) =>
                void onSave({ dict2: event.target.value as Settings["dict2"] })
              }
              disabled={!settings.defaultLang}
              title="To"
            >
              <option value="" disabled>
                To
              </option>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        </ToggleField>

        <ToggleField
          id="lastLang"
          checked={settings.lastLang}
          label={msg("optLastLangLab", "Remember the last languages used")}
          help={msg(
            "optLastLangHelp",
            "Languages you select in the popup will be saved for next use",
          )}
          onChange={async (checked) => {
            await onSave({ lastLang: checked, defaultLang: !checked });
          }}
        />

        <ToggleField
          id="popupAutocomplete"
          checked={settings.popupAutocomplete}
          label={msg(
            "optPopupAutocompleteLab",
            "Show word autocomplete in the popup search",
          )}
          help={msg(
            "optPopupAutocompleteHelp",
            "While typing in the extension popup, suggested words will appear below the search box",
          )}
          onChange={async (checked) => {
            await onSave({ popupAutocomplete: checked });
          }}
        />
      </div>
    </section>
  );
}
