import {
  EXTENSION_AUTHOR_EMAIL,
  EXTENSION_DONATION_URL,
  EXTENSION_REPO_URL,
} from "@/shared/build-meta";
import { msg } from "@/shared/i18n";

export function ContactsSection() {
  return (
    <section className="options-card">
      <div className="options-card__legend">
        <h2>{msg("optContacts", "Contacts")}</h2>
      </div>
      <div className="options-card__body options-stack">
        {EXTENSION_AUTHOR_EMAIL ? (
          <p className="options-muted">
            {msg(
              "optTranslationText",
              "If you'd like to help translate this extension into your language, or if you have any problems or suggestions, feel free to contact me at",
            )}{" "}
            <a href={`mailto:${EXTENSION_AUTHOR_EMAIL}`}>
              {EXTENSION_AUTHOR_EMAIL}
            </a>
            .
          </p>
        ) : null}
        {EXTENSION_REPO_URL ? (
          <p className="options-muted">
            {msg(
              "optOpenSourceText",
              "This extension is open-source and the source code is available here:",
            )}{" "}
            <a
              href={EXTENSION_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {EXTENSION_REPO_URL}
            </a>
          </p>
        ) : null}
        {EXTENSION_DONATION_URL ? (
          <div className="options-donation">
            <p className="options-muted">
              {msg("optDonationText", "Support this project:")}
              <a
                className="options-donation__button"
                href={EXTENSION_DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {msg("optDonationButton", "Buy me a coffe ❤️")}
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
