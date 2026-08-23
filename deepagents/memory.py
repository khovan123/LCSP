"""Managed Deep Agents memory configuration for LCSP.

LCSP persists authoritative assessment, evidence, legal corpus, and report state
through the API/database. Agent memory remains disabled unless a managed memory
backend is explicitly configured for deployment.
"""

memory = None
