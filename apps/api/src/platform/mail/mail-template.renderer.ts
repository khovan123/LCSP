import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = dirname(currentFilePath);
const templateDirPaths = [
  resolve(currentDirPath, "templates"),
  resolve(currentDirPath, "../../../platform/mail/templates"),
];

const templateCache = new Map<string, string>();

export function renderMailTemplate(
  templateName: string,
  variables: Record<string, string>,
): string {
  const template = getTemplate(templateName);
  return Object.entries(variables).reduce(
    (output, [key, value]) =>
      output.replaceAll(`{{${key}}}`, escapeHtml(value)),
    template,
  );
}

function getTemplate(templateName: string): string {
  const cached = templateCache.get(templateName);
  if (cached) {
    return cached;
  }

  const templatePath = resolveTemplatePath(templateName);
  const template = readFileSync(templatePath, "utf8");
  templateCache.set(templateName, template);
  return template;
}

function resolveTemplatePath(templateName: string): string {
  for (const templateDirPath of templateDirPaths) {
    const templatePath = resolve(templateDirPath, templateName);
    if (existsSync(templatePath)) {
      return templatePath;
    }
  }

  return resolve(templateDirPaths[0], templateName);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
