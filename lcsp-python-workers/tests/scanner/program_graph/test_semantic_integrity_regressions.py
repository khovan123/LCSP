from __future__ import annotations

from pathlib import Path

from lcsp_workers.scanner.program_graph.assembler import ProgramGraphAssembler


def _assemble(tmp_path: Path):
    return ProgramGraphAssembler().assemble(
        scan_job_id="semantic-integrity",
        snapshot_id="snapshot-semantic-integrity",
        commit_sha="abc123",
        workspace_path=tmp_path,
    )


def test_provider_named_redaction_call_is_not_ai_inference(tmp_path: Path) -> None:
    (tmp_path / "redaction.py").write_text(
        '''
import re
ANTHROPIC_KEY_PATTERN = re.compile(r"sk-ant-[A-Za-z0-9]+")

def redact(value):
    return ANTHROPIC_KEY_PATTERN.sub("[REDACTED]", value)
''',
        encoding="utf-8",
    )

    graph = _assemble(tmp_path)

    suspicious = [
        node
        for node in graph.nodes
        if "ANTHROPIC_KEY_PATTERN.sub" in str(node.get("label") or "")
    ]
    assert suspicious
    assert all(node.get("node_type") == "CALL_SITE" for node in suspicious)
    assert all(
        (node.get("attributes") or {}).get("semanticSuppressedRole")
        == "AI_MODEL_INVOCATION"
        for node in suspicious
    )
    assert not any(
        node.get("node_type") == "AI_OUTPUT"
        and "ANTHROPIC_KEY_PATTERN.sub" in str(node.get("label") or "")
        for node in graph.nodes
    )


def test_provider_constructor_is_not_ai_model_invocation(tmp_path: Path) -> None:
    (tmp_path / "client.py").write_text(
        '''
import openai

def build_client():
    return openai.OpenAI()
''',
        encoding="utf-8",
    )

    graph = _assemble(tmp_path)

    client_calls = [
        node
        for node in graph.nodes
        if str(node.get("label") or "").lower() == "openai.openai"
    ]
    assert client_calls
    assert all(node.get("node_type") == "CALL_SITE" for node in client_calls)
    assert not any(
        node.get("node_type") == "AI_OUTPUT"
        and "openai.OpenAI" in str(node.get("label") or "")
        for node in graph.nodes
    )


def test_get_accepted_reader_does_not_create_business_decision(tmp_path: Path) -> None:
    (tmp_path / "reader.py").write_text(
        '''
def load(client):
    return client.get_accepted_technical_evidence_report()
''',
        encoding="utf-8",
    )

    graph = _assemble(tmp_path)

    assert not any(
        node.get("node_type") in {"APPROVAL", "BUSINESS_DECISION"}
        and "get_accepted" in str(node.get("label") or "").lower()
        for node in graph.nodes
    )


def test_explicit_approve_action_remains_business_decision(tmp_path: Path) -> None:
    (tmp_path / "approval.py").write_text(
        '''
def decide(repository, request):
    result = repository.approve(request)
    repository.update(result)
    return result
''',
        encoding="utf-8",
    )

    graph = _assemble(tmp_path)

    assert any(
        node.get("node_type") == "APPROVAL"
        and "repository.approve" in str(node.get("label") or "")
        for node in graph.nodes
    )
    assert any(
        node.get("node_type") == "BUSINESS_DECISION"
        and "repository.approve" in str(node.get("label") or "")
        for node in graph.nodes
    )


def test_software_fingerprint_near_generic_verify_is_not_biometric(tmp_path: Path) -> None:
    (tmp_path / "fingerprint.py").write_text(
        '''
def verify_cache(cache, payload):
    fingerprintToken = cache.latestFingerprint
    verified = verify(fingerprintToken, payload)
    return verified
''',
        encoding="utf-8",
    )

    graph = _assemble(tmp_path)

    biometric = [
        node
        for node in graph.nodes
        if "SENSITIVE.BIOMETRIC" in (node.get("semantic_types") or [])
    ]
    assert all(node.get("resolution_state") != "CORROBORATED" for node in biometric)
