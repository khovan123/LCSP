"""LCSP Deep Agents harness boundary configuration.

This module configures the Deep Agents harness itself. LCSP application tools are
defined separately under ``tools/<node>/<tool-name>/code.py``.
"""

from __future__ import annotations

from deepagents import (
    FilesystemPermission,
    GeneralPurposeSubagentProfile,
    HarnessProfile,
    register_harness_profile,
)


LCSP_MODEL_SPEC = "openai:gpt-5"

# Deep Agents injects filesystem tools in addition to authored tools. LCSP keeps
# only read_file visible because Managed Skills use it for progressive disclosure.
# All other filesystem / execution tools are outside the assessment flow.
HIDDEN_BUILTIN_TOOLS = frozenset(
    {
        "ls",
        "write_file",
        "edit_file",
        "delete",
        "glob",
        "grep",
        "execute",
    }
)

LCSP_HARNESS_PROFILE = HarnessProfile(
    excluded_tools=HIDDEN_BUILTIN_TOOLS,
    general_purpose_subagent=GeneralPurposeSubagentProfile(enabled=False),
)

# read_file remains visible only for Managed Skills. No repository/code access is
# granted through the Deep Agents filesystem; repository evidence must come from
# LCSP governed application tools.
LCSP_FILESYSTEM_PERMISSIONS = [
    FilesystemPermission(
        operations=["read"],
        paths=["/skills/**"],
        mode="allow",
    ),
    FilesystemPermission(
        operations=["read", "write"],
        paths=["/**"],
        mode="deny",
    ),
]


def configure_lcsp_harness() -> None:
    """Register the LCSP harness profile before Managed Deep Agents compiles the graph."""
    register_harness_profile(LCSP_MODEL_SPEC, LCSP_HARNESS_PROFILE)
