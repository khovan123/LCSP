"""Stable import path delegating graph construction to Program Evidence Graph v2."""
from __future__ import annotations
from lcsp_workers.scanner.program_graph.assembler import ProgramGraphAssembler

class EvidenceGraphAssembler(ProgramGraphAssembler):
    """Compatibility class name only; all behavior is ProgramGraph v2."""
    pass
