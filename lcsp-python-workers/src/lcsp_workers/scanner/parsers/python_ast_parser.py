from __future__ import annotations

import ast
from dataclasses import dataclass, field
from pathlib import Path


MAX_SOURCE_BYTES = 50 * 1024


@dataclass(frozen=True)
class ParsedPythonFile:
    path: Path
    relative_path: str
    tree: ast.AST | None
    import_map: dict[str, str] = field(default_factory=dict)
    imported_symbols: dict[str, tuple[str, str]] = field(default_factory=dict)
    coverage_limited: bool = False
    skip_reason: str | None = None


class PythonAstParser:
    def parse_file(self, path: Path, workspace: Path) -> ParsedPythonFile:
        relative = self._relative_path(path, workspace)
        try:
            if path.stat().st_size > MAX_SOURCE_BYTES:
                return ParsedPythonFile(
                    path=path,
                    relative_path=relative,
                    tree=None,
                    coverage_limited=True,
                    skip_reason="file exceeds 50KB analysis limit",
                )
            source = path.read_text(encoding="utf-8")
        except OSError as error:
            return ParsedPythonFile(
                path=path,
                relative_path=relative,
                tree=None,
                coverage_limited=True,
                skip_reason=f"file unreadable: {type(error).__name__}",
            )

        try:
            tree = ast.parse(source, filename=relative)
        except SyntaxError:
            return ParsedPythonFile(
                path=path,
                relative_path=relative,
                tree=None,
                coverage_limited=True,
                skip_reason="syntax error",
            )

        visitor = _ImportVisitor()
        visitor.visit(tree)
        return ParsedPythonFile(
            path=path,
            relative_path=relative,
            tree=tree,
            import_map=visitor.import_map,
            imported_symbols=visitor.imported_symbols,
        )

    def _relative_path(self, path: Path, workspace: Path) -> str:
        try:
            return path.resolve(strict=False).relative_to(
                workspace.resolve(strict=False)
            ).as_posix()
        except ValueError:
            return path.name


class _ImportVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.import_map: dict[str, str] = {}
        self.imported_symbols: dict[str, tuple[str, str]] = {}

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            package = alias.name
            local_name = alias.asname or package.split(".", 1)[0]
            self.import_map[local_name] = package

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        module = node.module or ""
        root_package = module.split(".", 1)[0] if module else ""
        for alias in node.names:
            local_name = alias.asname or alias.name
            if root_package:
                self.import_map[local_name] = root_package
            self.imported_symbols[local_name] = (module, alias.name)

