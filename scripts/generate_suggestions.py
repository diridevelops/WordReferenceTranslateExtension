from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

try:
    from wordfreq import top_n_list
except ImportError as exc:  # pragma: no cover - local helper
    raise SystemExit(
        "wordfreq is required to generate suggestion datasets.\n"
        "Install it locally first, for example:\n"
        "  python -m pip install wordfreq"
    ) from exc


LANGUAGES = ("en", "es", "fr", "it")
TARGET_SIZE = 20000
RAW_LIMIT = 50000
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "data" / "suggestions"
NON_ALPHA_RE = re.compile(r"[^a-z]")


def normalize_word(word: str) -> str:
    folded = unicodedata.normalize("NFKD", word.lower())
    folded = "".join(char for char in folded if not unicodedata.combining(char))
    return NON_ALPHA_RE.sub("", folded)


def build_language_dataset(language: str) -> dict[str, object]:
    entries: list[tuple[str, str, int]] = []
    seen: set[str] = set()

    for rank, word in enumerate(top_n_list(language, RAW_LIMIT), start=1):
      normalized = normalize_word(word)
      if len(normalized) < 2:
          continue
      if normalized in seen:
          continue

      seen.add(normalized)
      entries.append((word, normalized, rank))
      if len(entries) >= TARGET_SIZE:
          break

    entries.sort(key=lambda entry: (entry[1], entry[2], len(entry[0]), entry[0]))

    index: dict[str, list[int]] = {}
    current_prefix = None
    start = 0

    for idx, (_, normalized, _) in enumerate(entries):
        prefix = normalized[:2]
        if prefix != current_prefix:
            if current_prefix is not None:
                index[current_prefix] = [start, idx]
            current_prefix = prefix
            start = idx

    if current_prefix is not None:
        index[current_prefix] = [start, len(entries)]

    return {
        "language": language,
        "entries": entries,
        "index": index,
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for language in LANGUAGES:
        dataset = build_language_dataset(language)
        output_path = OUTPUT_DIR / f"{language}.json"
        output_path.write_text(
            json.dumps(dataset, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
