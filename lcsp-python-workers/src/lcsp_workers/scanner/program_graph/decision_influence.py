"""Connect data lineage to deterministic business-decision and human-control facts."""
from __future__ import annotations

from .semantic_ir import SemanticEdgeFact, SemanticNodeFact, SemanticProgram

_ACTION_EDGES = frozenset({"APPROVES", "REJECTS", "RANKS", "RECOMMENDS", "UPDATES_STATUS"})
_ACTION_TYPES = frozenset({"APPROVAL", "REJECTION", "RANKING", "RECOMMENDATION", "STATUS_CHANGE", "BUSINESS_ACTION"})


class DecisionInfluenceEnricher:
    """Materialize decision nodes where code structure proves a business action call.

    This pass does not decide whether the action is legally automated. It only links the
    data consumed by a business-action call to a BUSINESS_DECISION node, links that
    decision to the action/outcome and to returned business-state data, and attaches
    human-review/override calls when they consume that decision state.
    """

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        node_by_key = {node.key: node for node in program.nodes}
        edges = tuple(program.edges)
        incoming_data = self._incoming_data(edges)
        outgoing_data = self._outgoing_data(edges)
        decision_by_output_data: dict[str, list[str]] = {}

        for edge in edges:
            if edge.edge_type not in _ACTION_EDGES:
                continue
            call = node_by_key.get(edge.source_key)
            action = node_by_key.get(edge.target_key)
            if not call or not action or action.node_type not in _ACTION_TYPES:
                continue

            decision_key = f"business-decision:{action.key}"
            program.add_node(
                SemanticNodeFact(
                    decision_key,
                    "BUSINESS_DECISION",
                    action.label,
                    action.file_path,
                    action.start_line,
                    action.end_line,
                    action.symbol_ref,
                    attributes={
                        "actionCategory": action.node_type,
                        "derivedFromAction": action.key,
                    },
                    semantic_types=action.semantic_types,
                    evidence_refs=action.evidence_refs,
                    origin="DATA_LINEAGE",
                    resolution_state="CORROBORATED",
                )
            )
            program.add_edge(
                SemanticEdgeFact(
                    "PRODUCES_OUTCOME",
                    decision_key,
                    action.key,
                    origin="DATA_LINEAGE",
                    resolution_state="CORROBORATED",
                )
            )

            for data_key in incoming_data.get(call.key, []):
                program.add_edge(
                    SemanticEdgeFact(
                        "INFLUENCES_DECISION",
                        data_key,
                        decision_key,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
            for data_key in outgoing_data.get(call.key, []):
                program.add_edge(
                    SemanticEdgeFact(
                        "WRITES_BUSINESS_STATE",
                        decision_key,
                        data_key,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
                decision_by_output_data.setdefault(data_key, []).append(decision_key)

        # Human review/override is a separate structural fact. Bind it to a decision
        # only when the human-control call consumes the state produced by that decision.
        refreshed_nodes = {node.key: node for node in program.nodes}
        for human in refreshed_nodes.values():
            if human.node_type not in {"HUMAN_REVIEW", "HUMAN_OVERRIDE"}:
                continue
            for data_key in incoming_data.get(human.key, []):
                for decision_key in decision_by_output_data.get(data_key, []):
                    program.add_edge(
                        SemanticEdgeFact(
                            "REVIEWED_BY" if human.node_type == "HUMAN_REVIEW" else "OVERRIDDEN_BY",
                            decision_key,
                            human.key,
                            origin="DATA_LINEAGE",
                            resolution_state="CORROBORATED",
                        )
                    )
        return program

    @staticmethod
    def _incoming_data(edges: tuple[SemanticEdgeFact, ...]) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        for edge in edges:
            if edge.edge_type != "FLOWS_TO" or not edge.source_key.startswith("data-object:"):
                continue
            result.setdefault(edge.target_key, []).append(edge.source_key)
        return result

    @staticmethod
    def _outgoing_data(edges: tuple[SemanticEdgeFact, ...]) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {}
        for edge in edges:
            if edge.edge_type != "FLOWS_TO" or not edge.target_key.startswith("data-object:"):
                continue
            result.setdefault(edge.source_key, []).append(edge.target_key)
        return result
