"""Managed sandbox declaration for the LCSP Deep Agent."""

from managed_deepagents import define_sandbox


sandbox = define_sandbox(
    default_timeout=300,
    idle_ttl_seconds=3600,
)


__all__ = ["sandbox"]
