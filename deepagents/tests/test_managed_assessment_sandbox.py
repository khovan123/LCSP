from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

from tools.common.capabilities.managed import agent_server_client
from tools.common.capabilities.platform import managed_workspace


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_same_assessment_reuses_one_managed_thread_across_pipeline_events() -> None:
    scan = agent_server_client.managed_thread_id(
        "scan_requested",
        {"assessmentId": "assessment-1", "scanJobId": "scan-1"},
        "corr-scan",
    )
    assessment = agent_server_client.managed_thread_id(
        "engineering_assessment_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-2"},
        "corr-assessment",
    )
    other = agent_server_client.managed_thread_id(
        "scan_requested",
        {"assessmentId": "assessment-2", "scanJobId": "scan-9"},
        "corr-other",
    )

    assert scan == assessment
    assert scan != other


def test_agent_server_dispatch_reuses_thread_and_keeps_event_out_of_prompt(monkeypatch) -> None:
    fake_client = MagicMock()
    fake_client.runs.wait.return_value = {"ok": True}
    monkeypatch.setattr(agent_server_client, "get_sync_client", lambda **_kwargs: fake_client)

    event = {
        "assessmentId": "assessment-1",
        "scanJobId": "scan-1",
        "snapshotId": "snapshot-1",
        "commitSha": "abc123",
        "secretInternalField": "must-not-be-copied-to-model-message",
    }
    result = agent_server_client.dispatch_managed_agent_event(
        "scan_requested",
        event,
        "corr-1",
    )

    assert result == {"ok": True}
    thread_id = agent_server_client.managed_thread_id("scan_requested", event, "corr-1")
    fake_client.threads.create.assert_called_once()
    assert fake_client.threads.create.call_args.kwargs["thread_id"] == thread_id
    assert fake_client.threads.create.call_args.kwargs["if_exists"] == "do_nothing"

    wait = fake_client.runs.wait.call_args
    assert wait.args[:2] == (thread_id, "lcsp-agent")
    assert wait.kwargs["context"]["system_event"] == event
    assert wait.kwargs["config"]["configurable"]["snapshot_id"] == "snapshot-1"
    assert wait.kwargs["config"]["configurable"]["cwd"] == "/workspace/repository"
    assert wait.kwargs["context"]["repository_path"] == "/"
    prompt = wait.kwargs["input"]["messages"][0]["content"]
    assert "secretInternalField" not in prompt
    assert "trusted lcsp system event" in prompt.lower()
    assert wait.kwargs["multitask_strategy"] == "enqueue"


def test_managed_backend_activation_is_scoped_to_repository_database() -> None:
    backend = object()

    assert managed_workspace.current_managed_backend() is None
    with managed_workspace.activate_managed_backend(backend):
        active = managed_workspace.current_managed_backend()
        assert isinstance(active, managed_workspace.AssessmentRepositoryBackend)
        assert active._backend is backend
    assert managed_workspace.current_managed_backend() is None


def test_thread_backend_resolver_delegates_to_mda_thread_sandbox(monkeypatch) -> None:
    import managed_deepagents.runtime as mda_runtime
    from sandbox import sandbox as sandbox_definition

    resolved = object()
    seen = []
    monkeypatch.setattr(
        mda_runtime,
        "_resolve_managed_sandbox",
        lambda sandbox, config: seen.append((sandbox, config)) or resolved,
    )
    config = {"configurable": {"thread_id": "thread-1"}}

    assert managed_workspace.resolve_managed_thread_backend(config) is resolved
    assert seen == [(sandbox_definition, config)]


def test_repository_analyzer_never_creates_a_child_sandbox() -> None:
    source = (
        PROJECT_ROOT
        / "tools/common/capabilities/evidence/repository_analysis/analyzer.py"
    ).read_text(encoding="utf-8")

    assert "SandboxClient" not in source
    assert "create_sandbox(" not in source
    assert "RepositoryWorkspace" not in source
    assert "current_managed_backend()" in source
    assert "persistent working database" in source
    assert "repository-rooted backend" in source


def test_codebase_memory_is_baked_into_managed_sandbox_without_host_graph_state() -> None:
    setup = (PROJECT_ROOT / "sandbox" / "setup.sh").read_text(encoding="utf-8")
    analyzer = (
        PROJECT_ROOT
        / "tools/common/capabilities/evidence/repository_analysis/analyzer.py"
    ).read_text(encoding="utf-8")

    assert 'CODEBASE_MEMORY_VERSION="0.11.0"' in setup
    assert 'codebase-memory-mcp==${CODEBASE_MEMORY_VERSION}' in setup
    assert "/usr/local/libexec/codebase-memory-mcp" in setup
    assert "/usr/local/bin/codebase-memory-graph" in setup
    assert 'CBM_CACHE_DIR="${CBM_CACHE_DIR:-${HOME:-/tmp}/.cache/codebase-memory-mcp}"' in setup
    assert "/workspace/repository/.codebase-memory" not in setup
    # Sandbox image creation must not start the CBM daemon or build a project graph.
    assert "cli list_projects" not in setup
    assert "cli index_repository" not in setup

    assert "codebase-memory-graph cli index_repository" in analyzer
    assert "check_index_coverage" in analyzer
    assert "Direct repository source remains authoritative" not in analyzer
    assert "source authority" in analyzer


def test_default_assessment_pipeline_does_not_materialize_a_second_repo() -> None:
    from tools.common.capabilities.assessment.investigation.engineering_rule.planned_pipeline import (
        PlannedEngineeringInvestigationPipeline,
    )

    assert PlannedEngineeringInvestigationPipeline.requires_code_workspace is False


def test_system_event_middleware_dispatches_inside_resolved_mda_backend(monkeypatch) -> None:
    import middleware.system_event_dispatch as system_dispatch
    from orchestration.context import LCSPRunContext

    backend = object()
    event = {
        "assessmentId": "assessment-1",
        "scanJobId": "scan-1",
        "snapshotId": "snapshot-1",
    }
    calls = []
    monkeypatch.setattr(
        system_dispatch,
        "resolve_managed_thread_backend",
        lambda config: calls.append(("resolve", config)) or backend,
    )
    monkeypatch.setattr(
        system_dispatch,
        "ensure_repository_for_event",
        lambda resolved, boundary, payload: calls.append(
            ("hydrate", resolved, boundary, payload)
        ),
    )

    def invoke(boundary, payload, correlation_id):
        active = managed_workspace.current_managed_backend()
        assert isinstance(active, managed_workspace.AssessmentRepositoryBackend)
        assert active._backend is backend
        calls.append(("invoke", boundary, payload, correlation_id))

    monkeypatch.setattr(system_dispatch, "invoke_boundary", invoke)
    runtime = SimpleNamespace(
        context=LCSPRunContext(
            assessment_id="assessment-1",
            correlation_id="corr-1",
            system_boundary_name="scan_requested",
            system_event=event,
        ),
        config={"configurable": {"thread_id": "thread-1"}},
    )

    result = system_dispatch.dispatch_managed_system_event.before_agent({}, runtime)

    assert result == {"jump_to": "end"}
    assert calls == [
        ("resolve", runtime.config),
        ("hydrate", backend, "scan_requested", event),
        ("invoke", "scan_requested", event, "corr-1"),
    ]
    assert managed_workspace.current_managed_backend() is None



def test_repository_database_backend_virtualizes_repo_as_agent_root() -> None:
    from deepagents.backends.protocol import (
        ExecuteResponse,
        FileDownloadResponse,
        FileUploadResponse,
        GlobResult,
        GrepResult,
        LsResult,
        WriteResult,
    )

    raw = MagicMock()
    raw.id = "sandbox-1"
    raw.ls.return_value = LsResult(
        entries=[{"path": "/workspace/repository/src/app.py", "is_dir": False}]
    )
    raw.glob.return_value = GlobResult(
        matches=[{"path": "/workspace/repository/src/app.py", "is_dir": False}]
    )
    raw.grep.return_value = GrepResult(
        matches=[{"path": "/workspace/repository/src/app.py", "line": 1, "text": "hello"}]
    )
    raw.write.return_value = WriteResult(path="/workspace/repository/.lcsp/agent/note.md")
    raw.upload_files.return_value = [
        FileUploadResponse(path="/workspace/repository/tmp/data.bin")
    ]
    raw.download_files.return_value = [
        FileDownloadResponse(
            path="/workspace/repository/src/app.py",
            content=b"print('ok')",
        )
    ]
    raw.execute.return_value = ExecuteResponse(output="ok", exit_code=0)

    backend = managed_workspace.repository_database_backend(raw)

    assert backend.ls("/").entries == [{"path": "/src/app.py", "is_dir": False}]
    assert backend.glob("*.py", "/").matches == [
        {"path": "/src/app.py", "is_dir": False}
    ]
    assert backend.grep("hello", "/").matches == [
        {"path": "/src/app.py", "line": 1, "text": "hello"}
    ]
    assert backend.write("/.lcsp/agent/note.md", "note").path == "/.lcsp/agent/note.md"
    assert backend.upload_files([("/tmp/data.bin", b"x")])[0].path == "/tmp/data.bin"
    assert backend.download_files(["/src/app.py"])[0].content == b"print('ok')"

    backend.execute("git status --short")

    raw.ls.assert_called_once_with("/workspace/repository")
    raw.glob.assert_called_once_with("*.py", "/workspace/repository")
    raw.grep.assert_called_once_with("hello", "/workspace/repository", None)
    raw.write.assert_called_once_with(
        "/workspace/repository/.lcsp/agent/note.md",
        "note",
    )
    raw.execute.assert_called_once_with(
        "cd /workspace/repository && git status --short"
    )


def test_repository_database_metadata_lives_inside_repo_and_agent_state_is_reserved() -> None:
    assert managed_workspace.REPOSITORY_META.startswith(
        managed_workspace.REPOSITORY_ROOT + "/.lcsp/"
    )
    assert managed_workspace.REPOSITORY_AGENT_STATE.startswith(
        managed_workspace.REPOSITORY_ROOT + "/.lcsp/"
    )


def test_repository_database_bootstraps_a_git_baseline() -> None:
    source = (
        PROJECT_ROOT / "tools/common/capabilities/platform/managed_workspace.py"
    ).read_text(encoding="utf-8")

    assert "git init -q" in source
    assert "git add -A" in source
    assert "LCSP baseline " in source
    assert ".lcsp/" in source
