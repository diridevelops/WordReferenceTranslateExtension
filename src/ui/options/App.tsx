import { useEffect, useId, useState } from "react";
import { getSettings, updateSettings } from "@/shared/storage";
import { hasPageAccess, requestPageAccess } from "@/shared/permissions";
import { msg } from "@/shared/i18n";
import type { Settings } from "@/shared/types";
import { AppearanceSection } from "./sections/AppearanceSection";
import { ContactsSection } from "./sections/ContactsSection";
import { CreditsSection } from "./sections/CreditsSection";
import { InSiteSection } from "./sections/InSiteSection";
import { TranslationSection } from "./sections/TranslationSection";

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pageAccess, setPageAccess] = useState(false);
  const shortcutSelectId = useId();

  useEffect(() => {
    document.title = `${msg("optTitle", "Settings")} - ${msg("extensionName", "WordReference Translate")}`;
    void (async () => {
      setSettings(await getSettings());
      setPageAccess(await hasPageAccess());
    })();
  }, []);

  async function save(partial: Partial<Settings>): Promise<void> {
    const next = await updateSettings(partial);
    setSettings(next);
  }

  async function requireHostAccess(nextValue: boolean): Promise<boolean> {
    if (!nextValue || pageAccess) {
      return true;
    }

    const granted = await requestPageAccess();
    const hasAccess = granted || (await hasPageAccess());
    setPageAccess(hasAccess);
    return hasAccess;
  }

  if (!settings) {
    return <main className="options-shell">Loading...</main>;
  }

  return (
    <main className="options-shell">
      <TranslationSection settings={settings} onSave={save} />
      <InSiteSection
        settings={settings}
        pageAccess={pageAccess}
        shortcutSelectId={shortcutSelectId}
        onSave={save}
        requireHostAccess={requireHostAccess}
      />
      <AppearanceSection settings={settings} onSave={save} />
      <ContactsSection />
      <CreditsSection />
    </main>
  );
}
