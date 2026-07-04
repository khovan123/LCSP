#!/usr/bin/env node

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DEV_DIR = path.join(ROOT, "docs", "developer");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((items) => items.some(Boolean));
  return body.map((items) => Object.fromEntries(header.map((key, index) => [key, items[index] ?? ""])));
}

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

function dateOnly(isoLike) {
  return isoLike.slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function sprintDay(sprintStart, sprintEnd, index, total) {
  const start = dateOnly(sprintStart);
  const end = dateOnly(sprintEnd);
  if (total <= 1) {
    return { start, due: end };
  }
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const span = Math.max(1, Math.round((endDate - startDate) / 86400000));
  const startOffset = Math.min(span, Math.floor((index / total) * span));
  const dueOffset = Math.min(span, Math.max(startOffset, startOffset + 2));
  return {
    start: addDays(start, startOffset),
    due: addDays(start, dueOffset),
  };
}

function taskPoints(row) {
  if (row.Status === "DONE") {
    return 1;
  }
  if (row["Main Flow"] === "true") {
    return row.Priority === "P1" ? 2 : 3;
  }
  if (/scanner|classification|reporting|legal|intelligence/.test(row.Module)) {
    return row.Priority === "P1" ? 2 : 3;
  }
  return row.Priority === "P1" ? 1 : 2;
}

function fibonacciCap(value) {
  if (value <= 1) {
    return 1;
  }
  if (value <= 2) {
    return 2;
  }
  if (value <= 3) {
    return 3;
  }
  if (value <= 5) {
    return 5;
  }
  if (value <= 8) {
    return 8;
  }
  return 13;
}

function priorityName(row) {
  if (row.Status === "DONE") {
    return "Low";
  }
  if (row["Main Flow"] === "true") {
    return row.Priority === "P1" ? "High" : "Highest";
  }
  if (row.Priority === "P0") {
    return "High";
  }
  return "Medium";
}

function typePoints(row, sprintTaskRows) {
  if (row["Issue Type"] === "Task") {
    return taskPoints(row);
  }
  if (row["Issue Type"] === "Story") {
    const storyTasks = sprintTaskRows.filter((task) => task.Story === row.Story);
    return fibonacciCap(Math.max(1, storyTasks.reduce((sum, task) => sum + taskPoints(task), 0)));
  }
  if (row["Issue Type"] === "Epic") {
    const module = row.Summary.replace(/^Module:\s*/, "");
    const moduleTasks = sprintTaskRows.filter((task) => task.Module === module);
    return moduleTasks.length > 3 ? 13 : 8;
  }
  return 1;
}

function typePriority(row, sprintTaskRows) {
  if (row["Issue Type"] === "Task") {
    return priorityName(row);
  }
  if (row["Issue Type"] === "Story") {
    const storyTasks = sprintTaskRows.filter((task) => task.Story === row.Story);
    if (storyTasks.some((task) => task["Main Flow"] === "true")) {
      return "Highest";
    }
    if (storyTasks.some((task) => task.Priority === "P0")) {
      return "High";
    }
    return "Medium";
  }
  if (row["Issue Type"] === "Epic") {
    const module = row.Summary.replace(/^Module:\s*/, "");
    const moduleTasks = sprintTaskRows.filter((task) => task.Module === module);
    if (moduleTasks.some((task) => task["Main Flow"] === "true")) {
      return "Highest";
    }
    if (moduleTasks.some((task) => task.Priority === "P0")) {
      return "High";
    }
    return "Medium";
  }
  return "Medium";
}

const rows = parseCsv(fs.readFileSync(path.join(DEV_DIR, "jira-lcsp-sprint-plan.csv"), "utf8"));
const epicBacklogRows = parseCsv(fs.readFileSync(path.join(DEV_DIR, "jira-lcsp-epics-backlog-plan.csv"), "utf8"));
const assignmentRows = parseCsv(fs.readFileSync(path.join(DEV_DIR, "lcsp-local-assignments.csv"), "utf8"));
const assignmentByKey = new Map(assignmentRows.map((row) => [row["Jira Key"], row]));
const estimateRows = [];

const sprints = [...new Set(rows.map((row) => row.Sprint))];
for (const sprint of sprints) {
  const sprintRows = rows.filter((row) => row.Sprint === sprint);
  const sprintTaskRows = sprintRows.filter((row) => row["Issue Type"] === "Task");
  const ordered = [...sprintRows].sort((left, right) => {
    const typeOrder = { Epic: 0, Story: 1, Task: 2 };
    if (typeOrder[left["Issue Type"]] !== typeOrder[right["Issue Type"]]) {
      return typeOrder[left["Issue Type"]] - typeOrder[right["Issue Type"]];
    }
    if (left.Story !== right.Story) {
      return left.Story.localeCompare(right.Story, undefined, { numeric: true });
    }
    return left["Jira Key"].localeCompare(right["Jira Key"], undefined, { numeric: true });
  });

  ordered.forEach((row, index) => {
    const dates =
      row["Issue Type"] === "Epic"
        ? { start: dateOnly(row.Start), due: dateOnly(row.End) }
        : sprintDay(row.Start, row.End, index, ordered.length);
    const assignment = assignmentByKey.get(row["Jira Key"]);
    const normalizedRow = assignment
      ? {
          ...row,
          Status: assignment.Status,
          Priority: assignment.Priority,
          Assignee: assignment.Assignee,
          "Main Flow": assignment["Main Flow"],
        }
      : row;
    const points = typePoints(normalizedRow, sprintTaskRows);
    const priority = typePriority(normalizedRow, sprintTaskRows);
    estimateRows.push({
      Sprint: row.Sprint,
      "Jira Key": row["Jira Key"],
      "Issue Type": row["Issue Type"],
      "Task ID": row["Task ID"],
      Summary: row.Summary,
      Assignee: normalizedRow.Assignee,
      Story: row.Story,
      "Start Date": dates.start,
      "Due Date": dates.due,
      "Story Points": points,
      Priority: priority,
      "Local Priority": normalizedRow.Priority,
      "Main Flow": normalizedRow["Main Flow"],
      Status: normalizedRow.Status,
      URL: row.URL,
    });
  });
}

const sprintStarts = rows.map((row) => row.Start).filter(Boolean).sort();
const sprintEnds = rows.map((row) => row.End).filter(Boolean).sort();
const projectDates = {
  start: dateOnly(sprintStarts[0] ?? "2026-07-04T00:00:00+07:00"),
  due: dateOnly(sprintEnds[sprintEnds.length - 1] ?? "2026-09-16T23:59:59+07:00"),
};

for (const epic of epicBacklogRows) {
  const moduleTasks = assignmentRows.filter((task) => task.Module === epic.Module);
  const normalizedRow = {
    ...epic,
    "Issue Type": "Epic",
    Priority: moduleTasks.some((task) => task.Priority === "P0") ? "P0" : "P1",
    "Main Flow": moduleTasks.some((task) => task["Main Flow"] === "true") ? "true" : "false",
  };
  estimateRows.push({
    Sprint: "Backlog",
    "Jira Key": epic["Jira Key"],
    "Issue Type": "Epic",
    "Task ID": "",
    Summary: epic.Summary,
    Assignee: "",
    Story: "",
    "Start Date": projectDates.start,
    "Due Date": projectDates.due,
    "Story Points": typePoints(normalizedRow, moduleTasks),
    Priority: typePriority(normalizedRow, moduleTasks),
    "Local Priority": normalizedRow.Priority,
    "Main Flow": normalizedRow["Main Flow"],
    Status: epic.Status,
    URL: epic.URL,
  });
}

writeCsv(
  path.join(DEV_DIR, "jira-lcsp-estimate-plan.csv"),
  [
    "Sprint",
    "Jira Key",
    "Issue Type",
    "Task ID",
    "Summary",
    "Assignee",
    "Story",
    "Start Date",
    "Due Date",
    "Story Points",
    "Priority",
    "Local Priority",
    "Main Flow",
    "Status",
    "URL",
  ],
  estimateRows,
);

const estimateGroups = [...new Set(estimateRows.map((row) => row.Sprint))];
const summary = estimateGroups.map((sprint) => {
  const sprintRows = estimateRows.filter((row) => row.Sprint === sprint);
  return {
    Sprint: sprint,
    Issues: sprintRows.length,
    Epics: sprintRows.filter((row) => row["Issue Type"] === "Epic").length,
    Stories: sprintRows.filter((row) => row["Issue Type"] === "Story").length,
    Tasks: sprintRows.filter((row) => row["Issue Type"] === "Task").length,
    Points: sprintRows.reduce((sum, row) => sum + Number(row["Story Points"]), 0),
    Highest: sprintRows.filter((row) => row.Priority === "Highest").length,
    High: sprintRows.filter((row) => row.Priority === "High").length,
    Medium: sprintRows.filter((row) => row.Priority === "Medium").length,
    Low: sprintRows.filter((row) => row.Priority === "Low").length,
  };
});

writeCsv(
  path.join(DEV_DIR, "jira-lcsp-estimate-plan-summary.csv"),
  ["Sprint", "Issues", "Epics", "Stories", "Tasks", "Points", "Highest", "High", "Medium", "Low"],
  summary,
);

const md = [
  "# LCSP Jira Estimate Plan",
  "",
  "Per-issue estimate plan for Jira `Start date`, `Due date`, `Story point estimate`, and `Priority`.",
  "",
  "## Rules",
  "",
  "- Epics remain in `Backlog` and keep project-level estimate dates; they are not assigned to execution sprints.",
  "- Story and Task dates are staggered inside each sprint window.",
  "- Main-flow P0 tasks use `Highest` priority and 3 task points.",
  "- Non-main P0 tasks use `High` priority and 2-3 task points depending on runtime complexity.",
  "- P1 tasks use `Medium` priority and 1-2 task points.",
  "- Story points are Fibonacci-capped from their child task estimates.",
  "- DONE tasks keep 1 point and `Low` priority for historical tracking.",
  "",
  "## Summary",
  "",
  "| Sprint | Issues | Epics | Stories | Tasks | Points | Highest | High | Medium | Low |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ...summary.map(
    (row) =>
      `| ${row.Sprint} | ${row.Issues} | ${row.Epics} | ${row.Stories} | ${row.Tasks} | ${row.Points} | ${row.Highest} | ${row.High} | ${row.Medium} | ${row.Low} |`,
  ),
  "",
  "## Artifacts",
  "",
  "- `docs/developer/jira-lcsp-estimate-plan.csv`",
  "- `docs/developer/jira-lcsp-estimate-plan-summary.csv`",
  "",
];

fs.writeFileSync(path.join(DEV_DIR, "jira-lcsp-estimate-plan.md"), `${md.join("\n")}\n`, "utf8");

console.log(JSON.stringify({ issues: estimateRows.length, summary }, null, 2));
