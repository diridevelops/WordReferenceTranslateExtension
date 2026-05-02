import { THEMES } from "@/shared/constants";
import { msg } from "@/shared/i18n";
import type { Settings } from "@/shared/types";
import { ControlField, SelectField } from "../fields";

const THEME_LABELS: Record<(typeof THEMES)[number], string> = {
  wordreference: "WordReference",
  darkula: "Darkula",
  midnight: "Midnight",
};

export function AppearanceSection(props: {
  settings: Settings;
  onSave: (partial: Partial<Settings>) => Promise<void>;
}) {
  const { settings, onSave } = props;

  return (
    <section className="options-card">
      <div className="options-card__legend">
        <h2>{msg("optAppearance", "Appearance")}</h2>
      </div>
      <div className="options-card__body options-card__body--grid">
        <ControlField
          label={msg("optThemeSelLab", "Change the theme of the extension")}
          help={msg(
            "optThemeSelHelp",
            "This will affect both the extension popup and the in-site translation popup",
          )}
        >
          <SelectField
            value={settings.themeSel}
            onChange={(event) =>
              void onSave({
                themeSel: event.target.value as Settings["themeSel"],
              })
            }
          >
            {THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {THEME_LABELS[theme]}
              </option>
            ))}
          </SelectField>
        </ControlField>

        <ControlField
          label={msg("fontSize", "Choose the font size in the extension window")}
          help={msg(
            "fontSizeHelp",
            "Choose how big the text will be in the extension popup ",
          )}
        >
          <div className="options-number-field">
            <input
              className="options-number"
              type="number"
              min={10}
              max={20}
              value={settings.fontSize}
              onChange={(event) =>
                void onSave({ fontSize: Number(event.target.value) })
              }
            />
            <span className="options-number-field__suffix">px</span>
          </div>
        </ControlField>
      </div>
    </section>
  );
}
