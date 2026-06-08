import { browser } from "wxt/browser";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseTranslationHtml } from "@/core/parse";
import { CHANGELOG_ITEMS, EXTENSION_VERSION, LANGUAGE_LABELS } from "@/shared/constants";
import { getPopupAutocomplete } from "@/shared/autocomplete";
import { msg } from "@/shared/i18n";
import { sendRuntimeMessage } from "@/shared/messages";
import { renderLegacyPopupResult } from "@/shared/render-legacy-popup";
import { getSettings, getUiState, updateSettings, updateUiState } from "@/shared/storage";
import type {
  AutocompleteResult,
  SearchHistoryEntry,
  TranslationMessageResponse,
} from "@/shared/types";

function clearElement(element: HTMLElement): void {
  element.replaceChildren();
}

function renderLoader(element: HTMLElement): void {
  const loader = element.ownerDocument.createElement("div");
  loader.className = "WRTloader";
  element.replaceChildren(loader);
}

export function PopupApp() {
  const rootRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const searchRegionRef = useRef<HTMLDivElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const [query, setQuery] = useState("");
  const [dict1, setDict1] = useState<Awaited<ReturnType<typeof getSettings>>["dict1"]>(null);
  const [dict2, setDict2] = useState<Awaited<ReturnType<typeof getSettings>>["dict2"]>(null);
  const [currentResponse, setCurrentResponse] = useState<TranslationMessageResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteResult[]>([]);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState(-1);
  const [autocompleteSpacerHeight, setAutocompleteSpacerHeight] = useState(0);
  const [autocompleteMaxHeight, setAutocompleteMaxHeight] = useState<number | null>(null);

  const handleLookupWord = useEffectEvent(
    async (lookup: {
      word: string;
      dict1: SearchHistoryEntry["dict1"];
      dict2: SearchHistoryEntry["dict2"];
    }) => {
      await runSearch(lookup.word, lookup.dict1, lookup.dict2);
    },
  );

  useEffect(() => {
    document.title = msg("popTitle", "WordReference Popup");
    void (async () => {
      const [loadedSettings, uiState] = await Promise.all([getSettings(), getUiState()]);
      setSettings(loadedSettings);
      setDict1(loadedSettings.dict1);
      setDict2(loadedSettings.dict2);
      setShowChangelog(
        Boolean(uiState.pendingChangelogVersion) && CHANGELOG_ITEMS.length > 0,
      );
      document.documentElement.dataset.theme = loadedSettings.themeSel;
    })();
  }, []);

  useEffect(() => {
    if (settings) {
      document.documentElement.dataset.theme = settings.themeSel;
    }
  }, [settings]);

  useEffect(() => {
    let frameId: number | null = null;

    if (!settings?.popupAutocomplete || loading) {
      frameId = window.requestAnimationFrame(() => {
        setAutocompleteItems([]);
        setActiveAutocompleteIndex(-1);
      });
      return () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    let cancelled = false;

    void (async () => {
      const nextAutocompleteItems = await getPopupAutocomplete({
        query,
        dict1,
        dict2,
      });
      if (cancelled) {
        return;
      }

      setAutocompleteItems(nextAutocompleteItems);
      setActiveAutocompleteIndex(-1);
    })();

    return () => {
      cancelled = true;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [query, dict1, dict2, loading, settings?.popupAutocomplete]);

  useEffect(() => {
    const handleDocumentPointerDown = (event: MouseEvent) => {
      if (
        searchRegionRef.current &&
        event.target instanceof Node &&
        !searchRegionRef.current.contains(event.target)
      ) {
        setAutocompleteItems([]);
        setActiveAutocompleteIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!autocompleteItems.length) {
        if (autocompleteSpacerHeight !== 0) {
          setAutocompleteSpacerHeight(0);
        }
        if (autocompleteMaxHeight !== null) {
          setAutocompleteMaxHeight(null);
        }
        return;
      }

      const root = rootRef.current;
      const autocompleteElement = autocompleteRef.current;
      if (!root || !autocompleteElement) {
        return;
      }

      const rootRect = root.getBoundingClientRect();
      const autocompleteRect = autocompleteElement.getBoundingClientRect();
      const baselineRootHeight = Math.max(
        0,
        Math.ceil(rootRect.height - autocompleteSpacerHeight),
      );
      const baselineRootBottom = rootRect.bottom - autocompleteSpacerHeight;
      const availableExpansion = Math.max(0, 500 - baselineRootHeight);
      const overflow = Math.max(
        0,
        Math.ceil(autocompleteRect.bottom - baselineRootBottom + 4),
      );
      const nextAutocompleteSpacerHeight = Math.min(overflow, availableExpansion);
      const remainingOverflow = overflow - nextAutocompleteSpacerHeight;
      const maxVisibleAutocompleteHeight = Math.max(
        120,
        Math.floor(
          baselineRootBottom +
            availableExpansion -
            autocompleteRect.top -
            4,
        ),
      );
      const nextAutocompleteMaxHeight =
        remainingOverflow > 0
          ? Math.min(
              autocompleteElement.scrollHeight,
              maxVisibleAutocompleteHeight,
            )
          : null;

      if (nextAutocompleteSpacerHeight !== autocompleteSpacerHeight) {
        setAutocompleteSpacerHeight(nextAutocompleteSpacerHeight);
      }
      if (nextAutocompleteMaxHeight !== autocompleteMaxHeight) {
        setAutocompleteMaxHeight(nextAutocompleteMaxHeight);
      }
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [autocompleteItems, autocompleteSpacerHeight, autocompleteMaxHeight]);

  useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    if (!currentResponse) {
      clearElement(contentRef.current);
      return;
    }

    if (!currentResponse.ok) {
      contentRef.current.textContent = currentResponse.error;
      return;
    }

    try {
      const result = parseTranslationHtml(
        currentResponse.html,
        currentResponse.meta,
      );
      renderLegacyPopupResult(contentRef.current, result, {
        onLookupWord: handleLookupWord,
      });
    } catch (error) {
      contentRef.current.textContent =
        error instanceof Error ? error.message : msg("popError", "Something went wrong.");
    }
  }, [currentResponse]);

  const canSearch = useMemo(() => Boolean(query.trim() && dict1 && dict2), [query, dict1, dict2]);
  const hasAutocomplete =
    Boolean(settings?.popupAutocomplete) && autocompleteItems.length > 0;

  async function persistLanguageChoice(nextDict1: typeof dict1, nextDict2: typeof dict2): Promise<void> {
    if (!settings || settings.defaultLang || !settings.lastLang) {
      return;
    }

    const nextSettings = await updateSettings({ dict1: nextDict1, dict2: nextDict2 });
    setSettings(nextSettings);
  }

  async function runSearch(
    word: string,
    source = dict1,
    target = dict2,
    replaceHistory = false,
  ): Promise<void> {
    if (!source || !target) {
      setError(msg("optTranslISPopupErrorLang", "No languages selected."));
      setCurrentResponse(null);
      return;
    }

    setLoading(true);
    setError("");
    setAutocompleteItems([]);
    setActiveAutocompleteIndex(-1);
    if (contentRef.current) {
      renderLoader(contentRef.current);
    }

    const response = await sendRuntimeMessage<TranslationMessageResponse>({
      type: "TRANSLATE",
      payload: { dict1: source, dict2: target, word },
    });

    setLoading(false);
    setCurrentResponse(response);
    if (!response.ok) {
      setError(response.error);
      return;
    }

    setQuery("");
    setHistory((current) => {
      const nextEntry: SearchHistoryEntry = { dict1: source, dict2: target, word };
      return replaceHistory ? current : [...current, nextEntry];
    });
  }

  async function selectAutocompleteItem(
    autocompleteItem: AutocompleteResult,
  ): Promise<void> {
    setQuery(autocompleteItem.display);
    await runSearch(autocompleteItem.display.trim());
  }

  async function handleSourceChange(nextValue: string): Promise<void> {
    const nextDict1 = nextValue as typeof dict1;
    setDict1(nextDict1);
    await persistLanguageChoice(nextDict1, dict2);
  }

  async function handleTargetChange(nextValue: string): Promise<void> {
    const nextDict2 = nextValue as typeof dict2;
    setDict2(nextDict2);
    await persistLanguageChoice(dict1, nextDict2);
  }

  async function swapLanguages(): Promise<void> {
    if (!dict1 || !dict2 || dict1 === "auto") {
      return;
    }

    const nextDict1 = dict2;
    const nextDict2 = dict1;
    setDict1(nextDict1);
    setDict2(nextDict2);
    await persistLanguageChoice(nextDict1, nextDict2);
  }

  async function navigateBack(): Promise<void> {
    if (history.length < 2) {
      return;
    }

    const previous = history[history.length - 2];
    if (!previous) {
      return;
    }

    setHistory((current) => current.slice(0, -1));
    await runSearch(previous.word, previous.dict1, previous.dict2, true);
  }

  async function closeChangelog(): Promise<void> {
    await updateUiState({
      changelogViewedVersion: EXTENSION_VERSION,
      pendingChangelogVersion: null,
    });
    await browser.action.setBadgeText({ text: "" });
    setShowChangelog(false);
  }

  return (
    <main
      id="WRText-root"
      ref={(node) => {
        rootRef.current = node;
      }}
    >
      <section id="WRText-header">
        <div id="WRText-LeftBtns">
          <div id="WRText-back" className="WRText-button" style={{ display: history.length > 1 ? "block" : "none" }}>
            <a
              id="WRText-backBtn"
              href="#"
              title={msg("popBackBtn", "Previous")}
              onClick={(event) => {
                event.preventDefault();
                void navigateBack();
              }}
            />
            <span className="WRText-buttonLab">{msg("popBackBtn", "Previous")}</span>
          </div>
        </div>

        <div id="WRText-search" ref={searchRegionRef}>
          <div id="WRText-searchWrap">
            <input
              id="WRText-searchBox"
              type="text"
              autoFocus
              value={query}
              placeholder={msg("popSearchBox", "Word to search")}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && hasAutocomplete) {
                  event.preventDefault();
                  setActiveAutocompleteIndex((current) =>
                    current >= autocompleteItems.length - 1 ? 0 : current + 1,
                  );
                  return;
                }

                if (event.key === "ArrowUp" && hasAutocomplete) {
                  event.preventDefault();
                  setActiveAutocompleteIndex((current) =>
                    current <= 0 ? autocompleteItems.length - 1 : current - 1,
                  );
                  return;
                }

                if (
                  event.key === "Enter" &&
                  activeAutocompleteIndex >= 0 &&
                  activeAutocompleteIndex < autocompleteItems.length
                ) {
                  const activeAutocompleteItem =
                    autocompleteItems[activeAutocompleteIndex];
                  if (!activeAutocompleteItem) {
                    return;
                  }

                  event.preventDefault();
                  void selectAutocompleteItem(activeAutocompleteItem);
                  return;
                }

                if (event.key === "Enter" && canSearch) {
                  void runSearch(query.trim());
                }
              }}
            />
            <input
              id="WRText-searchBtn"
              type="button"
              value=""
              disabled={!canSearch || loading}
              onClick={() => void runSearch(query.trim())}
            />
            {hasAutocomplete ? (
              <div
                id="WRText-autocomplete"
                ref={(node) => {
                  autocompleteRef.current = node;
                }}
                role="listbox"
                style={{
                  maxHeight: autocompleteMaxHeight
                    ? `${autocompleteMaxHeight}px`
                    : undefined,
                }}
              >
                {autocompleteItems.map((autocompleteItem, index) => (
                  <button
                    key={`${autocompleteItem.language}-${autocompleteItem.display}-${index}`}
                    type="button"
                    className={`WRText-autocomplete${index === activeAutocompleteIndex ? " is-active" : ""}`}
                    role="option"
                    aria-selected={index === activeAutocompleteIndex}
                    onMouseEnter={() => setActiveAutocompleteIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void selectAutocompleteItem(autocompleteItem)}
                  >
                    <span className="WRText-autocomplete__tag">
                      {autocompleteItem.tag}
                    </span>
                    <span className="WRText-autocomplete__label">
                      {autocompleteItem.display}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div id="WRText-langSel">
            <select id="WRText-dict1" name="dict1" title="From" value={dict1 ?? ""} onChange={(event) => void handleSourceChange(event.target.value)}>
              <option value="" disabled>
                From
              </option>
              <option value="auto">Auto detect</option>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            <span id="WRText-switchBtn" onClick={() => void swapLanguages()}>
              <span />
            </span>

            <select id="WRText-dict2" name="dict2" title="To" value={dict2 ?? ""} onChange={(event) => void handleTargetChange(event.target.value)}>
              <option value="" disabled>
                To
              </option>
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div id="WRText-RightBtns">
          <div className="WRText-button">
            <a
              id="WRText-options"
              href="#"
              title={msg("popOptionBtn", "Settings")}
              onClick={(event) => {
                event.preventDefault();
                void browser.runtime.openOptionsPage();
              }}
            />
            <span className="WRText-buttonLab">{msg("popOptionBtn", "Settings")}</span>
          </div>
        </div>
      </section>

      <section
        id="WRText-content"
        ref={(node) => {
          contentRef.current = node;
        }}
        style={{ fontSize: settings ? `${settings.fontSize}px` : undefined }}
      >
        {!currentResponse && !error ? null : null}
      </section>

      {hasAutocomplete && autocompleteSpacerHeight > 0 ? (
        <div
          id="WRText-autocompleteSpacer"
          aria-hidden="true"
          style={{ height: `${autocompleteSpacerHeight}px` }}
        />
      ) : null}

      <section id="WRText-footer">
        {showChangelog ? (
          <div id="WRText-changelog">
            <span id="WRText-changelogText">Changelog</span>
            <span id="WRText-changelogClose" onClick={() => void closeChangelog()}>
              x
            </span>
            <ul id="WRText-changelogList">
              {CHANGELOG_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div id="WRText-version">Version {browser.runtime.getManifest().version}</div>
      </section>
    </main>
  );
}
