#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const REPO_BASE = "https://github.com/khovan123/LCSP";
const MODULE_ROOT = path.join(ROOT, "docs", "implementation", "tasks", "modules");
const DEV_DIR = path.join(ROOT, "docs", "developer");

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, header, rows) {
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(header.map((key) => csvEscape(row[key] ?? "")).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function repoUrl(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const absolute = path.join(ROOT, normalized);
  const kind = fs.existsSync(absolute) && fs.statSync(absolute).isDirectory() ? "tree" : "blob";
  return `${REPO_BASE}/${kind}/main/${normalized}`;
}

function listMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listMarkdownFiles(absolute);
    }
    if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      return [absolute];
    }
    return [];
  });
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) {
    return {};
  }

  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    return {};
  }

  const frontmatter = text.slice(4, end).split("\n");
  const result = {};
  let listKey = null;

  for (const rawLine of frontmatter) {
    const line = rawLine.trimEnd();
    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listKey && listItem) {
      result[listKey].push(listItem[1].trim());
      continue;
    }

    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) {
      continue;
    }

    const [, key, value] = field;
    if (value === "") {
      result[key] = [];
      listKey = key;
    } else {
      result[key] = value.trim();
      listKey = null;
    }
  }

  return result;
}

function extractTitle(text) {
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "Untitled Task";
}

function extractOutcome(text) {
  const match = text.match(/^## Outcome\s*\n+([\s\S]*?)(?=\n## |\n### |\n---\n|$)/m);
  if (!match) {
    return "";
  }
  return match[1].replace(/\s+/g, " ").trim();
}

function storyArtifact(storyRef) {
  const prefix = storyRef.replace(".", "-");
  const dir = path.join(ROOT, "docs", "implementation-artifacts");
  if (!fs.existsSync(dir)) {
    return null;
  }
  const file = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith(".md"))
    .sort()[0];
  return file ? `docs/implementation-artifacts/${file}` : null;
}

function storyTitle(storyRef) {
  const artifact = storyArtifact(storyRef);
  if (!artifact) {
    return `Story ${storyRef}`;
  }
  const text = fs.readFileSync(path.join(ROOT, artifact), "utf8");
  return text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? `Story ${storyRef}`;
}

function sortStoryRefs(left, right) {
  const [leftMajor, leftMinor] = left.split(".").map(Number);
  const [rightMajor, rightMinor] = right.split(".").map(Number);
  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }
  return leftMinor - rightMinor;
}

function sortTasks(left, right) {
  if (left.module !== right.module) {
    return left.module.localeCompare(right.module);
  }
  return left.relativePath.localeCompare(right.relativePath);
}

function countWhere(rows, predicate) {
  return rows.filter(predicate).length;
}

const tasks = listMarkdownFiles(MODULE_ROOT)
  .map((absolutePath) => {
    const text = fs.readFileSync(absolutePath, "utf8");
    const relativePath = path.relative(ROOT, absolutePath).replace(/\\/g, "/");
    const frontmatter = parseFrontmatter(text);
    const title = extractTitle(text);
    const outcome = extractOutcome(text);
    const dependsOn = Array.isArray(frontmatter.depends_on) ? frontmatter.depends_on : [];
    const module = frontmatter.module ?? path.dirname(path.relative(MODULE_ROOT, absolutePath)).replace(/\\/g, "/");

    return {
      issueType: "Task",
      summary: `${frontmatter.task_id}: ${title}`,
      description: `${outcome} Source: ${repoUrl(relativePath)}`.trim(),
      taskId: frontmatter.task_id,
      module,
      runtime: frontmatter.runtime ?? "",
      priority: frontmatter.priority ?? "",
      status: frontmatter.status ?? "",
      story: frontmatter.epic_story ?? "",
      dependsOnUrls: dependsOn.map((item) => repoUrl(`docs/implementation/tasks/modules/${item}`)).join("; "),
      sourceUrl: repoUrl(relativePath),
      relativePath,
      title,
    };
  })
  .sort(sortTasks);

const modules = [...new Set(tasks.map((task) => task.module))].sort();
const stories = [...new Set(tasks.map((task) => task.story).filter(Boolean))].sort(sortStoryRefs);

const moduleRows = modules.map((module) => {
  const moduleTasks = tasks.filter((task) => task.module === module);
  return {
    "Issue Type": "Epic",
    Summary: `Module: ${module}`,
    Description: `LCSP module backlog generated from ${repoUrl("docs/implementation/tasks/modules/README.md")} for ${module}.`,
    Module: module,
    "Task Count": moduleTasks.length,
    "P0 Count": countWhere(moduleTasks, (task) => task.priority === "P0"),
    "P1 Count": countWhere(moduleTasks, (task) => task.priority === "P1"),
    "Done Count": countWhere(moduleTasks, (task) => task.status === "DONE"),
    "Ready Count": countWhere(moduleTasks, (task) => task.status === "READY_FOR_DEV"),
    "Catalog URL": repoUrl("docs/implementation/tasks/modules/README.md"),
  };
});

const storyRows = stories.map((story) => {
  const storyTasks = tasks.filter((task) => task.story === story);
  const artifact = storyArtifact(story);
  return {
    "Issue Type": "Story",
    Summary: storyTitle(story),
    Description: `Implementation story ${story}; generated from module-scoped task frontmatter in ${repoUrl("docs/implementation/tasks/modules")}.`,
    Story: story,
    "Task Count": storyTasks.length,
    "P0 Ready": countWhere(storyTasks, (task) => task.priority === "P0" && task.status === "READY_FOR_DEV"),
    "P1 Ready": countWhere(storyTasks, (task) => task.priority === "P1" && task.status === "READY_FOR_DEV"),
    "Done Count": countWhere(storyTasks, (task) => task.status === "DONE"),
    "Story URL": artifact ? repoUrl(artifact) : "",
    "Task Catalog URL": repoUrl("docs/implementation/tasks/README.md"),
  };
});

const taskRows = tasks.map((task) => ({
  "Issue Type": task.issueType,
  Summary: task.summary,
  Description: task.description,
  "Task ID": task.taskId,
  Module: task.module,
  Runtime: task.runtime,
  Priority: task.priority,
  Status: task.status,
  Story: task.story,
  "Depends On URLs": task.dependsOnUrls,
  "Source URL": task.sourceUrl,
}));

const mappingRows = tasks.map((task) => {
  const artifact = storyArtifact(task.story);
  return {
    Story: task.story,
    "Story Summary": storyTitle(task.story),
    "Task ID": task.taskId,
    "Task Summary": task.title,
    Module: task.module,
    Priority: task.priority,
    Status: task.status,
    "Story URL": artifact ? repoUrl(artifact) : "",
    "Task URL": task.sourceUrl,
  };
});

writeCsv(path.join(DEV_DIR, "jira-lcsp-modules-import.csv"), Object.keys(moduleRows[0]), moduleRows);
writeCsv(path.join(DEV_DIR, "jira-lcsp-stories-import.csv"), Object.keys(storyRows[0]), storyRows);
writeCsv(path.join(DEV_DIR, "jira-lcsp-tasks-import.csv"), Object.keys(taskRows[0]), taskRows);
writeCsv(path.join(DEV_DIR, "jira-lcsp-story-task-mapping.csv"), Object.keys(mappingRows[0]), mappingRows);

console.log(
  JSON.stringify(
    {
      modules: moduleRows.length,
      stories: storyRows.length,
      tasks: taskRows.length,
      mappingRows: mappingRows.length,
    },
    null,
    2,
  ),
);
