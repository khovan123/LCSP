from __future__ import annotations

from pathlib import Path

from tools.common.capabilities.evidence.graph.construction.assembly.assembler import ProgramGraphAssembler
from tools.common.capabilities.evidence.graph.schema.semantic_ir import SemanticNodeFact, SemanticProgram
from tools.common.capabilities.evidence.graph.lineage.data.data_lineage import SemanticDataLineageExtractor
from tools.common.capabilities.evidence.graph.resolution.dispatch.protocol_resolution import ProtocolBoundaryResolver
from tools.common.capabilities.evidence.graph.resolution.cross_project_resolution import CrossReferenceResolver


def test_graphql_document_and_decorated_resolver_reuse_canonical_symbol(tmp_path: Path) -> None:
    (tmp_path / "schema.graphql").write_text("type Query { users: [User!]! }\n", encoding="utf-8")
    (tmp_path / "resolver.py").write_text(
        "from graphene import ObjectType\nclass Query(ObjectType):\n    def users(self):\n        return []\n",
        encoding="utf-8",
    )
    graph = ProgramGraphAssembler().assemble(
        scan_job_id="protocol", snapshot_id="snapshot", commit_sha="commit", workspace_path=tmp_path
    )
    assert any(node["node_type"] == "GRAPHQL_OPERATION" for node in graph.nodes)


def test_proto_service_identity_is_qualified_and_ambiguous_methods_stay_unresolved(tmp_path: Path) -> None:
    proto = tmp_path / "users.proto"
    proto.write_text(
        "package users.v1;\nservice Users { rpc Get (GetRequest) returns (User); }\nmessage GetRequest { string id = 1; }\nmessage User { string id = 1; }\n",
        encoding="utf-8",
    )
    program = SemanticProgram()
    SemanticDataLineageExtractor(tmp_path).enrich(program)
    methods = [node for node in program.nodes if node.node_type == "GRPC_METHOD"]
    assert len(methods) == 1
    assert methods[0].attributes["service"] == "Users"
    assert methods[0].attributes["package"] == "users.v1"
    assert methods[0].label == "Get"

    program.add_node(SemanticNodeFact("symbol:a:Get", "METHOD", "Get"))
    program.add_node(SemanticNodeFact("symbol:b:Get", "METHOD", "Get"))
    ProtocolBoundaryResolver().enrich(program)
    assert any(node.node_type == "UNRESOLVED_DYNAMIC_TARGET" for node in program.nodes)


def test_messaging_facts_use_canonical_queue_and_event_vocabulary(tmp_path: Path) -> None:
    (tmp_path / "worker.py").write_text(
        "from celery import shared_task\n@shared_task(name='invoice-created')\ndef consume():\n    return True\n\ndef publish():\n    return consume.delay()\n",
        encoding="utf-8",
    )
    graph = ProgramGraphAssembler().assemble(
        scan_job_id="messaging", snapshot_id="snapshot", commit_sha="commit", workspace_path=tmp_path
    )
    assert any(node["node_type"] in {"QUEUE", "EVENT"} for node in graph.nodes)
    assert any(edge["edge_type"] in {"PUBLISHES_TO_QUEUE", "CONSUMES_FROM_QUEUE", "PUBLISHES_EVENT", "CONSUMES_EVENT"} for edge in graph.edges)


def test_messaging_resource_resolution_requires_provider_and_literal_name() -> None:
    program = SemanticProgram(
        nodes=[
            SemanticNodeFact("queue:a", "QUEUE", "orders", attributes={"provider": "kafka", "resourceName": "orders"}),
            SemanticNodeFact("queue:b", "QUEUE", "orders", attributes={"provider": "kafka", "resourceName": "orders"}),
            SemanticNodeFact("queue:c", "QUEUE", "orders", attributes={"provider": "rabbitmq", "resourceName": "orders"}),
        ]
    )
    CrossReferenceResolver().enrich(program, Path("."))
    assert any(edge.edge_type == "RESOLVES_TO" and edge.source_key == "queue:a" for edge in program.edges)
    assert not any(edge.source_key == "queue:a" and edge.target_key == "queue:c" for edge in program.edges)
