"""LCSP agent-facing authored tool namespace.

Only model-callable capability packages live physically under ``tools/``.
Historical implementation imports are redirected by migration plumbing owned by
``runtime``; new code must import canonical ``runtime.*`` paths directly.
"""

from runtime.compat import install_runtime_aliases


install_runtime_aliases()
