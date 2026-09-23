from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest


EXPECTED_CODEBASE_MEMORY_VERSION = "0.11.0"


def _run(binary: Path, args: list[str], *, env: dict[str, str]) -> dict:
    completed = subprocess.run(
        [str(binary), "cli", "--quiet", *args],
        check=True,
        capture_output=True,
        text=True,
        env=env,
        timeout=90,
    )
    output = completed.stdout.strip()
    assert output, f"Codebase Memory returned no output for {args[0]}"
    return json.loads(output.splitlines()[-1])


@pytest.mark.integration
@pytest.mark.e2e
def test_codebase_memory_indexes_searches_and_reports_coverage_for_repository(
    tmp_path: Path,
) -> None:
    """Exercise the exact pinned CBM binary used by the MDA sandbox recipe.

    CI/developer environments opt in by setting LCSP_CODEBASE_MEMORY_E2E_BINARY
    to the pre-provisioned 0.11.0 native binary. The normal unit suite remains
    hermetic and does not download or bootstrap executables at test time.
    """

    configured = os.environ.get("LCSP_CODEBASE_MEMORY_E2E_BINARY", "").strip()
    if not configured:
        pytest.skip("LCSP_CODEBASE_MEMORY_E2E_BINARY is not provisioned")

    binary = Path(configured).expanduser().resolve()
    if not binary.is_file():
        pytest.fail(f"Codebase Memory E2E binary does not exist: {binary}")

    version = subprocess.run(
        [str(binary), "--version"],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    ).stdout.strip()
    assert version == f"codebase-memory-mcp {EXPECTED_CODEBASE_MEMORY_VERSION}"

    repository = tmp_path / "repository"
    repository.mkdir()
    (repository / "app.py").write_text(
        "def greet(name: str) -> str:\n"
        "    return f\"hello {name}\"\n\n"
        "def main() -> None:\n"
        "    print(greet(\"LCSP\"))\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "init", "-q"], cwd=repository, check=True, timeout=10)
    subprocess.run(
        ["git", "config", "user.email", "lcsp-e2e@example.invalid"],
        cwd=repository,
        check=True,
        timeout=10,
    )
    subprocess.run(
        ["git", "config", "user.name", "LCSP E2E"],
        cwd=repository,
        check=True,
        timeout=10,
    )
    subprocess.run(["git", "add", "app.py"], cwd=repository, check=True, timeout=10)
    subprocess.run(
        ["git", "commit", "-qm", "fixture"],
        cwd=repository,
        check=True,
        timeout=10,
    )

    home = tmp_path / "home"
    cache = tmp_path / "cache"
    home.mkdir()
    cache.mkdir()
    env = {
        **os.environ,
        "HOME": str(home),
        "XDG_CACHE_HOME": str(cache),
        "CBM_CACHE_DIR": str(cache / "codebase-memory-mcp"),
    }
    project = "lcsp-mda-cbm-e2e"

    indexed = _run(
        binary,
        [
            "index_repository",
            "--repo-path",
            str(repository),
            "--name",
            project,
            "--mode",
            "fast",
        ],
        env=env,
    )
    assert indexed["status"] == "indexed"
    assert indexed["not_indexed_files_count"] == 0
    assert indexed["skipped_count"] == 0

    architecture = _run(
        binary,
        ["get_architecture", json.dumps({"project": project, "format": "json"})],
        env=env,
    )
    assert architecture["project"] == project

    search = _run(
        binary,
        [
            "search_graph",
            json.dumps({"project": project, "query": "greet", "format": "json"}),
        ],
        env=env,
    )
    assert search["total"] >= 1
    assert any(row[0].endswith(".greet") for row in search["rows"])

    coverage = _run(
        binary,
        [
            "check_index_coverage",
            json.dumps(
                {
                    "project": project,
                    "paths": ["app.py"],
                    "diagnostics": "full",
                    "format": "json",
                }
            ),
        ],
        env=env,
    )
    assert coverage["project"] == project
    assert coverage["paths"][0]["path"] == "app.py"
    assert coverage["paths"][0]["status"] == "no_recorded_issue"
    assert coverage["paths"][0]["freshness"] == "metadata_match"
