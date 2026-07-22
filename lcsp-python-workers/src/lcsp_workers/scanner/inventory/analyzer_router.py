from __future__ import annotations

from .language_types import (
    LANGUAGE_JAVASCRIPT,
    LANGUAGE_PYTHON,
    LANGUAGE_TYPESCRIPT,
    SUPPORT_BASIC,
    SUPPORT_FULL,
    SUPPORT_MANIFEST_ONLY,
    SUPPORT_SKIP,
    AnalyzerDispatch,
    LanguageClassification,
)


DEFAULT_MAX_PYTHON_FILES = 500
DEFAULT_MAX_TS_JS_FILES = 500


class AnalyzerRouter:
    def __init__(
        self,
        *,
        max_python_files: int = DEFAULT_MAX_PYTHON_FILES,
        max_ts_js_files: int = DEFAULT_MAX_TS_JS_FILES,
    ) -> None:
        self._max_python_files = max_python_files
        self._max_ts_js_files = max_ts_js_files

    def route(self, classifications: list[LanguageClassification]) -> AnalyzerDispatch:
        python_files: list[str] = []
        ts_js_files: list[str] = []
        basic_files: list[str] = []
        skipped_files: list[str] = []
        coverage_limitations: list[dict[str, str]] = []

        for classification in classifications:
            if classification.support_level == SUPPORT_FULL:
                if classification.language == LANGUAGE_PYTHON:
                    python_files.append(classification.file_path)
                    continue
                if classification.language in {LANGUAGE_TYPESCRIPT, LANGUAGE_JAVASCRIPT}:
                    ts_js_files.append(classification.file_path)
                    continue
                basic_files.append(classification.file_path)
                continue

            if classification.support_level in {SUPPORT_BASIC, SUPPORT_MANIFEST_ONLY}:
                basic_files.append(classification.file_path)
            else:
                skipped_files.append(classification.file_path)

            if classification.coverage_limitation:
                coverage_limitations.append(
                    {
                        "file_path": classification.file_path,
                        "reason": classification.skip_reason
                        or f"support_level={classification.support_level}",
                    }
                )

        python_files, overflow_python_files = self._truncate(
            python_files,
            self._max_python_files,
        )
        python_overflow = len(overflow_python_files)
        skipped_files.extend(overflow_python_files)
        if python_overflow:
            coverage_limitations.append(
                {
                    "file_path": "<python-quota>",
                    "reason": (
                        "python_file_limit_exceeded: "
                        f"analyzed={len(python_files)} skipped={python_overflow} "
                        f"limit={self._max_python_files}"
                    ),
                }
            )

        ts_js_files, overflow_ts_js_files = self._truncate(
            ts_js_files,
            self._max_ts_js_files,
        )
        ts_js_overflow = len(overflow_ts_js_files)
        skipped_files.extend(overflow_ts_js_files)
        if ts_js_overflow:
            coverage_limitations.append(
                {
                    "file_path": "<ts-js-quota>",
                    "reason": (
                        "ts_js_file_limit_exceeded: "
                        f"analyzed={len(ts_js_files)} skipped={ts_js_overflow} "
                        f"limit={self._max_ts_js_files}"
                    ),
                }
            )

        return AnalyzerDispatch(
            python_files=python_files,
            ts_js_files=ts_js_files,
            basic_files=basic_files,
            skipped_files=skipped_files,
            coverage_limitations=coverage_limitations,
        )

    def _truncate(self, items: list[str], limit: int) -> tuple[list[str], list[str]]:
        if len(items) <= limit:
            return items, []
        trimmed = items[:limit]
        return trimmed, items[limit:]
