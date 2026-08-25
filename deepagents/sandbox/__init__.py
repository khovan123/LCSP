"""Managed sandbox declaration for the LCSP Deep Agent."""

from managed_deepagents import define_sandbox


sandbox = define_sandbox(
    scope="thread",
    default_timeout=300,
)


__all__ = ["sandbox"]
