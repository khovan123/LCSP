import { z } from "zod";

import { ASSESSMENT_REPOSITORY_PROVIDERS } from "@lcsp/contracts/assessment";

import { GIT_PROVIDER_OPTIONS } from "../config/git-provider-options";

export const repositorySetupSchema = z
  .object({
    provider: z.string().trim().min(1),
    repositoryUrl: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
    const provider = GIT_PROVIDER_OPTIONS.find(
      (option) => option.id === value.provider,
    );
    if (!provider?.supported) {
      context.addIssue({
        code: "custom",
        path: ["provider"],
        message: "provider-not-supported",
      });
      return;
    }

    let url: URL;
    try {
      url = new URL(value.repositoryUrl);
    } catch {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-url-invalid",
      });
      return;
    }

    if (
      url.protocol !== "https:" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-url-invalid",
      });
      return;
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname !== provider.hostname) {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-provider-mismatch",
      });
      return;
    }

    const rawPath = url.pathname.replace(/\/$/u, "");
    if (
      rawPath.includes("/-/") ||
      rawPath.includes("/tree/") ||
      rawPath.includes("/blob/")
    ) {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-path-invalid",
      });
      return;
    }

    const segments = rawPath
      .replace(/\.git$/u, "")
      .split("/")
      .filter(Boolean);

    if (segments.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-path-invalid",
      });
      return;
    }

    const isGitHub = provider.id === ASSESSMENT_REPOSITORY_PROVIDERS.github;
    const repositoryFullName = isGitHub
      ? `${segments[0]}/${segments[1]}`
      : segments.join("/");

    const pattern = isGitHub
      ? /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u
      : /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/u;

    if ((isGitHub && segments.length !== 2) || !pattern.test(repositoryFullName)) {
      context.addIssue({
        code: "custom",
        path: ["repositoryUrl"],
        message: "repository-path-invalid",
      });
    }
  });

export type RepositorySetupFormData = z.infer<typeof repositorySetupSchema>;



