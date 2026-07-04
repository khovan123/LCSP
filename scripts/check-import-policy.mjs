import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const REPO_ROOT = process.cwd();
const SOURCE_ROOTS = ["apps", "packages"].map((segment) => resolve(REPO_ROOT, segment));
const SCAN_ROOTS = [...SOURCE_ROOTS, resolve(REPO_ROOT, "tests")];
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const SOURCE_PATH_PATTERN = /(?:^|[/\\])(?:apps|packages)[/\\][^"'`]+[/\\]src[/\\]/;
const PACKAGE_SOURCE_PATH_PATTERN = /^@lcsp\/[^"'`]+\/src\//;

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

function findNearestPackageName(filePath) {
  let currentDirectory = dirname(filePath);

  while (currentDirectory.startsWith(REPO_ROOT)) {
    const packageJsonPath = join(currentDirectory, "package.json");

    try {
      if (statSync(packageJsonPath).isFile()) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        return typeof packageJson.name === "string" ? packageJson.name : null;
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

function extractSpecifiers(sourceText) {
  const specifiers = [];
  const pattern = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^"'`\n]+?\s+from\s+)?["']([^"']+)["']/g;

  for (const match of sourceText.matchAll(pattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function isUnderSourceRoot(filePath) {
  return SOURCE_ROOTS.some((root) => filePath.startsWith(root + "/") || filePath === root);
}

const violations = [];

for (const root of SCAN_ROOTS) {
  for (const filePath of listFiles(root)) {
    const sourceText = readFileSync(filePath, "utf8");
    const packageName = findNearestPackageName(filePath);
    const packageRoot = findNearestPackageRoot(filePath);

    for (const specifier of extractSpecifiers(sourceText)) {
      if (isUnderSourceRoot(filePath) && (specifier.startsWith("./") || specifier.startsWith("../"))) {
        const resolvedImportPath = resolve(dirname(filePath), specifier);
        const leavesPackageBoundary =
          !packageRoot || (resolvedImportPath !== packageRoot && !resolvedImportPath.startsWith(packageRoot + "/"));

        if (leavesPackageBoundary) {
          violations.push({
            filePath,
            message: `relative workspace import/export "${specifier}" leaves the current app/package boundary and is not allowed`
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
          message: `self-import "${specifier}" is not allowed inside ${packageName}; use internal relative imports within the current app/package instead`
        });
      }

      if (SOURCE_PATH_PATTERN.test(specifier) || PACKAGE_SOURCE_PATH_PATTERN.test(specifier)) {
        violations.push({
          filePath,
          message: `direct workspace source-path import "${specifier}" is not allowed; import via public package/app exports instead`
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Import policy violations found:\n");

  for (const violation of violations) {
    console.error(`- ${relative(REPO_ROOT, violation.filePath)}: ${violation.message}`);
  }

  process.exit(1);
}

console.log("Import policy check passed.");
