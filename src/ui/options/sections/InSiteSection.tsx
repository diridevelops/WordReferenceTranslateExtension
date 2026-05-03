import { msg } from "@/shared/i18n";
import type { Settings } from "@/shared/types";
import { SelectField, ToggleField } from "../fields";
import {
  buildShortcut,
  formatShortcut,
  getShortcutParts,
  MODIFIER_OPTIONS,
  PRIMARY_KEY_OPTIONS,
} from "../shortcut";

export function InSiteSection(props: {
  settings: Settings;
  pageAccess: boolean;
  shortcutSelectId: string;
  onSave: (partial: Partial<Settings>) => Promise<void>;
  requireHostAccess: (nextValue: boolean) => Promise<boolean>;
}) {
  const { settings, pageAccess, shortcutSelectId, onSave, requireHostAccess } =
    props;
  const shortcutParts = getShortcutParts(settings.translISKeyboardInput);

  return (
    <section className="options-card">
      <div className="options-card__legend">
        <h2>{msg("optInSite", "In-site integration")}</h2>
      </div>
      <div className="options-card__body">
        <p className="options-muted">
          {pageAccess
            ? msg(
                "optPageAccessEnabled",
                "Optional page access is enabled.",
              )
            : msg(
                "optPageAccessPrompt",
                "Allow page access to use in-page translation features.",
              )}
        </p>

        <ToggleField
          id="translContext"
          checked={settings.translContext}
          label={msg(
            "optTranslContextLab",
            "Translate the selected word from the context-menu (right-click)",
          )}
          help={msg(
            "optTranslContextHelp",
            "When you select a word in a web page and right click, an option to translate the word will show up",
          )}
          onChange={async (checked) => {
            if (!(await requireHostAccess(checked))) {
              return;
            }
            await onSave({ translContext: checked });
          }}
        />

        <ToggleField
          id="translISPopup"
          checked={settings.translISPopup}
          label={msg(
            "optTranslISPopupLab",
            "Translate the selected word directly in the page by selecting the word while Alt key is pressed",
          )}
          help={msg(
            "optTranslISPopupHelp",
            "When you select a word in a web page while Alt is held along, a popup with the translation will show up (Alt can also be used to select links without opening them)",
          )}
          onChange={async (checked) => {
            if (!(await requireHostAccess(checked))) {
              return;
            }
            await onSave({ translISPopup: checked });
          }}
        />

        <ToggleField
          id="translISPopupIcon"
          checked={settings.translISPopupIcon}
          label={msg(
            "optTranslISPopupIconLab",
            "After selecting a word, click an icon next to it to translate it",
          )}
          help={msg(
            "optTranslISPopupIconHelp",
            "An icon will appear near the selected word, click it to translate",
          )}
          onChange={async (checked) => {
            if (!(await requireHostAccess(checked))) {
              return;
            }
            await onSave({ translISPopupIcon: checked });
          }}
        />

        <ToggleField
          id="translISPopupComb"
          checked={settings.translISPopupComb}
          label={msg(
            "optTranslISPopupCombLab",
            "Translate the selected word directly in the page by pressing this combination (click to modify)",
          )}
          help={msg(
            "optTranslISPopupCombHelp",
            "Max 3 keys. Some shortcut are reserved by the browser and cannot be inserted",
          )}
          onChange={async (checked) => {
            if (!(await requireHostAccess(checked))) {
              return;
            }
            await onSave({ translISPopupComb: checked });
          }}
        >
          <div className="shortcut-builder">
            <div className="shortcut-builder__summary">
              {formatShortcut(settings.translISKeyboardInput)}
            </div>

            <div className="shortcut-builder__group">
              <span className="shortcut-builder__label">
                {msg("optShortcutModifiers", "Modifier keys")}
              </span>
              <div className="shortcut-builder__modifiers">
                {MODIFIER_OPTIONS.map((option) => (
                  <label key={option.code} className="shortcut-builder__modifier">
                    <input
                      type="checkbox"
                      checked={shortcutParts.modifiers.includes(option.code)}
                      disabled={!settings.translISPopupComb}
                      onChange={(event) => {
                        const nextModifiers = event.target.checked
                          ? [...shortcutParts.modifiers, option.code]
                          : shortcutParts.modifiers.filter(
                              (code) => code !== option.code,
                            );
                        void onSave({
                          translISKeyboardInput: buildShortcut(
                            nextModifiers,
                            shortcutParts.primaryCode,
                          ),
                        });
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="shortcut-builder__group">
              <label className="shortcut-builder__label" htmlFor={shortcutSelectId}>
                {msg("optShortcutMainKey", "Main key")}
              </label>
              <SelectField
                id={shortcutSelectId}
                value={shortcutParts.primaryCode}
                disabled={!settings.translISPopupComb}
                onChange={(event) =>
                  void onSave({
                    translISKeyboardInput: buildShortcut(
                      shortcutParts.modifiers,
                      event.target.value,
                    ),
                  })
                }
              >
                <option value="">{msg("optShortcutNone", "No key")}</option>
                {PRIMARY_KEY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <button
              type="button"
              className="ghost-button"
              disabled={!settings.translISPopupComb}
              onClick={() => void onSave({ translISKeyboardInput: null })}
            >
              {msg("optShortcutClear", "Clear shortcut")}
            </button>
          </div>
        </ToggleField>
      </div>
    </section>
  );
}
