"""Remote Managed MCP capabilities for LCSP Deep Agents.

Codebase Memory is intentionally not declared here. Managed Deep Agents 0.7 only
accepts remote HTTP/SSE MCP servers, while codebase-memory-mcp is a local stdio
server that must see the assessment repository inside the thread-owned sandbox.
Repository analysis therefore installs that server into the managed sandbox and
exposes its graph/search tools from the same repository database.
"""

from __future__ import annotations

from managed_deepagents import define_mcp


_servers: dict[str, dict[str, object]] = {
    "langchain_docs": {
        "transport": "http",
        "url": "https://docs.langchain.com/mcp",
        "default_tool_timeout": 30,
    },
    "langchain_reference": {
        "transport": "http",
        "url": "https://reference.langchain.com/mcp",
        "default_tool_timeout": 30,
    },
}


mcp = define_mcp(
    servers=_servers,
    prefix_tool_name_with_server_name=True,
    throw_on_load_error=False,
    use_standard_content_blocks=True,
)


__all__ = ["mcp"]
