import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const REPO_ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "packages"].map((segment) => resolve(REPO_ROOT, segment));
const SCAN_ROOTS = [...SOURCE_ROOTS, resolve(REPO_ROOT, "tests")];
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const SOURCE_PATH_PATTERN = /(?:^|[/\\])(?:apps|packages)[/\\][^"'`]+[/\\]src[/\\]/;
const PACKAGE_SOURCE_PATH_PATTERN = /^@lcsp\/[^"'`]+\/src\//;
const FIX_MODE = process.argv.includes("--fix");
const IMPORT_POLICY_FILES = process.env.IMPORT_POLICY_FILES?.split(/\s+/)
  .map((filePath) => filePath.trim())
  .filter(Boolean);

function listFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") {
        continue;
      }

      files.push(...listFiles(entryPath));
      continue;
    }

    if (entry.isFile() && SOURCE_FILE_PATTERN.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

function scanFiles() {
  if (IMPORT_POLICY_FILES && IMPORT_POLICY_FILES.length > 0) {
    return IMPORT_POLICY_FILES.map((filePath) => resolve(REPO_ROOT, filePath)).filter(
      (filePath) =>
        existsSync(filePath) &&
        SOURCE_FILE_PATTERN.test(filePath) &&
        SCAN_ROOTS.some((root) => filePath.startsWith(root + "/") || filePath === root),
    );
  }

  return SCAN_ROOTS.flatMap((root) => listFiles(root));
}

function findNearestPackageName(filePath) {
  const packageJson = findNearestPackageJson(filePath);
  return typeof packageJson?.name === "string" ? packageJson.name : null;
}

function findNearestPackageJson(filePath) {
  let currentDirectory = dirname(filePath);

  while (currentDirectory.startsWith(REPO_ROOT)) {
    const packageJsonPath = join(currentDirectory, "package.json");

    try {
      if (statSync(packageJsonPath).isFile()) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return { ...packageJson, root: currentDirectory };
      }
    } catch {
      // Keep walking until the repo root.
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return null;
}

function findNearestPackageRoot(filePath) {
  let currentDirectory = dirname(filePath);

  while (currentDirectory.startsWith(REPO_ROOT)) {
    const packageJsonPath = join(currentDirectory, "package.json");

    try {
      if (statSync(packageJsonPath).isFile()) {
        return currentDirectory;
      }
    } catch {
      // Keep walking until the repo root.
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return null;
}

function extractSpecifierMatches(sourceText) {
  const matches = [];
  const pattern = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^"'`\n]+?\s+from\s+)?(["'])([^"']+)\1/g;

  for (const match of sourceText.matchAll(pattern)) {
    matches.push({
      specifier: match[2],
      start: match.index + match[0].lastIndexOf(match[2]),
      end: match.index + match[0].lastIndexOf(match[2]) + match[2].length,
    });
  }

  return matches;
}

function isUnderSourceRoot(filePath) {
  return SOURCE_ROOTS.some((root) => filePath.startsWith(root + "/") || filePath === root);
}

function normalizeSpecifier(filePath) {
  const normalized = filePath.replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function relativeSpecifier(fromFilePath, toFilePath) {
  return normalizeSpecifier(relative(dirname(fromFilePath), toFilePath));
}

function candidateSourceFile(packageRoot, packageSubpath) {
  const sourceSubpath = packageSubpath === "." ? "index" : packageSubpath.replace(/^\.\//, "");
  const candidates = [
    resolve(packageRoot, "src", `${sourceSubpath}.ts`),
    resolve(packageRoot, "src", `${sourceSubpath}.tsx`),
    resolve(packageRoot, "src", sourceSubpath, "index.ts"),
    resolve(packageRoot, "src", sourceSubpath, "index.tsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function packageExportForSourcePath(packageJson, sourcePath) {
  const exports = packageJson?.exports;
  if (!exports || typeof exports !== "object" || Array.isArray(exports)) {
    return null;
  }

  const normalizedSourcePath = `./${relative(packageJson.root, sourcePath).replace(/\\/g, "/")}`;

  for (const [exportPath, targetPath] of Object.entries(exports)) {
    if (typeof targetPath === "string" && targetPath === normalizedSourcePath) {
      return exportPath === "." ? packageJson.name : `${packageJson.name}/${exportPath.replace(/^\.\//, "")}`;
    }
  }

  return null;
}

function resolveImportTarget(importerPath, specifier) {
  const resolved = resolve(dirname(importerPath), specifier);
  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    join(resolved, "index.ts"),
    join(resolved, "index.tsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? resolved;
}

function safeFixForSpecifier(filePath, specifier, packageName, packageRoot) {
  if (!isUnderSourceRoot(filePath)) {
    return null;
  }

  if (packageName && packageRoot && (specifier === packageName || specifier.startsWith(`${packageName}/`))) {
    const packageSubpath = specifier === packageName ? "." : `./${specifier.slice(packageName.length + 1)}`;
    const targetFilePath = candidateSourceFile(packageRoot, packageSubpath);

    if (!targetFilePath) {
      return null;
    }

    return {
      specifier: relativeSpecifier(filePath, targetFilePath),
      reason: `self-import "${specifier}" -> internal relative import`,
    };
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const targetFilePath = resolveImportTarget(filePath, specifier);
    const targetPackageJson = findNearestPackageJson(targetFilePath);

    if (!targetPackageJson || !targetPackageJson.root || targetPackageJson.root === packageRoot) {
      return null;
    }

    const publicExportSpecifier = packageExportForSourcePath(targetPackageJson, targetFilePath);

    if (!publicExportSpecifier) {
      return null;
    }

    return {
      specifier: publicExportSpecifier,
      reason: `cross-package relative import "${specifier}" -> public package export`,
    };
  }

  return null;
}

function applyReplacements(sourceText, replacements) {
  let fixedText = sourceText;

  for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
    fixedText = `${fixedText.slice(0, replacement.start)}${replacement.specifier}${fixedText.slice(replacement.end)}`;
  }

  return fixedText;
}

const violations = [];
const fixes = [];

for (const filePath of scanFiles()) {
    const sourceText = readFileSync(filePath, "utf8");
    const packageName = findNearestPackageName(filePath);
    const packageRoot = findNearestPackageRoot(filePath);
    const replacements = [];

    for (const match of extractSpecifierMatches(sourceText)) {
      const { specifier } = match;
      const safeFix = safeFixForSpecifier(filePath, specifier, packageName, packageRoot);

      if (FIX_MODE && safeFix) {
        replacements.push({
          start: match.start,
          end: match.end,
          specifier: safeFix.specifier,
        });
        fixes.push({
          filePath,
          message: safeFix.reason,
        });
        continue;
      }

      if (isUnderSourceRoot(filePath) && (specifier.startsWith("./") || specifier.startsWith("../"))) {
        const resolvedImportPath = resolve(dirname(filePath), specifier);
        const leavesPackageBoundary =
          !packageRoot || (resolvedImportPath !== packageRoot && !resolvedImportPath.startsWith(packageRoot + "/"));

        if (leavesPackageBoundary) {
          violations.push({
            filePath,
            message: `relative workspace import/export "${specifier}" leaves the current app/package boundary and is not allowed`,
          });
        }
      }

      if (
        isUnderSourceRoot(filePath) &&
        packageName &&
        (specifier === packageName || specifier.startsWith(`${packageName}/`))
      ) {
        violations.push({
          filePath,
          message: `self-import "${specifier}" is not allowed inside ${packageName}; use internal relative imports within the current app/package instead`,
        });
      }

      if (SOURCE_PATH_PATTERN.test(specifier) || PACKAGE_SOURCE_PATH_PATTERN.test(specifier)) {
        violations.push({
          filePath,
          message: `direct workspace source-path import "${specifier}" is not allowed; import via public package/app exports instead`,
        });
      }
    }

    if (FIX_MODE && replacements.length > 0) {
      writeFileSync(filePath, applyReplacements(sourceText, replacements));
    }
}

if (FIX_MODE && fixes.length > 0) {
  console.log("Import policy safe fixes applied:\n");

  for (const fix of fixes) {
    console.log(`- ${relative(REPO_ROOT, fix.filePath)}: ${fix.message}`);
  }

  console.log("");
}

if (violations.length > 0) {
  console.error("Import policy violations found:\n");

  for (const violation of violations) {
    console.error(`- ${relative(REPO_ROOT, violation.filePath)}: ${violation.message}`);
  }

  process.exit(1);
}

console.log("Import policy check passed.");
