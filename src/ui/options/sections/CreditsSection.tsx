import {
  EXTENSION_AUTHOR_NAME,
  EXTENSION_AUTHOR_WEBSITE,
} from "@/shared/build-meta";
import { msg } from "@/shared/i18n";

export function CreditsSection() {
  return (
    <section className="options-card">
      <div className="options-card__legend">
        <h2>{msg("optCredits", "Credits")}</h2>
      </div>
      <div className="options-card__body options-stack">
        <p className="options-muted">
          Thanks a lot for the extension translations to:
        </p>
        <ul className="options-list">
          <li>Spanish - Manuel Zapata</li>
          <li>
            Italian - Maicol Battistini (
            <a
              href="https://maicol07.it"
              target="_blank"
              rel="noopener noreferrer"
            >
              maicol07.it
            </a>
            )
          </li>
          <li>
            French - Benjamin RIOU (
            <a
              href="https://benriou.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              benriou.com
            </a>
            )
          </li>
          <li>Portuguese (Brazil) - Paulo R. Koronfli</li>
        </ul>
        {EXTENSION_AUTHOR_NAME ? (
          <p className="options-muted">
            {msg("optAuthorText", "Extension created by")}{" "}
            {EXTENSION_AUTHOR_NAME}
            {EXTENSION_AUTHOR_WEBSITE ? (
              <>
                {" "}(
                <a
                  href={EXTENSION_AUTHOR_WEBSITE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {EXTENSION_AUTHOR_WEBSITE}
                </a>
                )
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}
