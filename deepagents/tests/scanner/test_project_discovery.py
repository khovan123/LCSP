import json
from pathlib import Path

from tools.common.capabilities.evidence.scanner.inventory.project import (
    ProjectDescriptor,
    ProjectDiscovery,
    ProjectDetectorRegistry,
    ProjectLanguageResult,
    aggregate_project_results,
)
from tools.common.capabilities.evidence.scanner.analyzers.protocol import ANALYZER_SUCCESS


def _write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def test_polyglot_projects_have_stable_ids_and_specific_file_ownership(tmp_path: Path) -> None:
    _write(tmp_path / "web/package.json", json.dumps({"name": "web"}))
    _write(tmp_path / "web/src/page.ts", "export const page = 1;\n")
    _write(tmp_path / "worker/pyproject.toml", "[project]\nname = 'worker'\n")
    _write(tmp_path / "worker/main.py", "print('ok')\n")
    _write(tmp_path / "README.md", "repository\n")

    first = ProjectDiscovery().discover(tmp_path)
    second = ProjectDiscovery().discover(tmp_path)

    assert [(p.relative_root, p.project_id) for p in first.projects] == [
        (p.relative_root, p.project_id) for p in second.projects
    ]
    projects = {p.relative_root: p for p in first.projects}
    assert projects["web"].project_kind == "javascript"
    assert projects["worker"].project_kind == "python"
    assert "typescript" in projects["web"].detected_languages
    assert "python" in projects["worker"].detected_languages
    assert first.file_ownership["web/src/page.ts"] == projects["web"].project_id
    assert first.file_ownership["worker/main.py"] == projects["worker"].project_id
    assert "README.md" in first.unowned_files


def test_related_python_manifests_deduplicate_to_one_project(tmp_path: Path) -> None:
    _write(tmp_path / "pyproject.toml", "[project]\nname = 'service'\n")
    _write(tmp_path / "requirements.txt", "httpx\n")

    result = ProjectDiscovery().discover(tmp_path)

    assert len(result.projects) == 1
    assert set(result.projects[0].manifest_paths) == {"pyproject.toml", "requirements.txt"}


def test_nested_projects_have_parent_and_malformed_detector_isolated(tmp_path: Path) -> None:
    _write(tmp_path / "package.json", json.dumps({"name": "root"}))
    _write(tmp_path / "apps/web/package.json", json.dumps({"name": "web"}))
    _write(tmp_path / "apps/web/page.ts", "export const page = 1;\n")

    result = ProjectDiscovery().discover(tmp_path)
    projects = {p.relative_root: p for p in result.projects}

    assert projects["apps/web"].parent_project_id == projects[""].project_id
    assert result.file_ownership["apps/web/page.ts"] == projects["apps/web"].project_id


def test_detector_failure_does_not_discard_successful_detectors(tmp_path: Path) -> None:
    class GoodDetector:
        name = "a-good"

        def detect(self, workspace):
            return (ProjectDescriptor("p", workspace, "", manifest_paths=("x",)),)

    class BadDetector:
        name = "b-bad"

        def detect(self, workspace):
            raise RuntimeError("bad manifest")

    result = ProjectDetectorRegistry((GoodDetector(), BadDetector())).discover(tmp_path)

    assert [project.project_id for project in result.projects] == ["p"]
    assert result.limitations == ("project_detector_failed:b-bad:RuntimeError",)


def test_malformed_manifest_is_explicit_limitation(tmp_path: Path) -> None:
    _write(tmp_path / "package.json", "{not-json")

    result = ProjectDiscovery().discover(tmp_path)

    assert result.projects[0].limitations == ("manifest_parse_failed:package.json",)
    assert "manifest_parse_failed:package.json" in result.limitations


def test_project_results_preserve_success_and_unsupported_outcomes() -> None:
    projects = (ProjectDescriptor("p1", Path("."), "one"), ProjectDescriptor("p2", Path("."), "two"))
    results = aggregate_project_results(
        projects,
        (
            ProjectLanguageResult("p1", "python", "python", ANALYZER_SUCCESS),
            ProjectLanguageResult("p2", "csharp", None, "UNSUPPORTED"),
        ),
    )

    assert results[0].language_results[0].status == ANALYZER_SUCCESS
    assert results[1].language_results[0].status == "UNSUPPORTED"
