"""Deployment-shared Managed Deep Agents memory for tenant-neutral knowledge only."""

from managed_deepagents import define_memory


memory = define_memory(scope="agent")


__all__ = ["memory"]
