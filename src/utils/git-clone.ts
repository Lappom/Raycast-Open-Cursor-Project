import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { access, mkdir } from "fs/promises";
import { showToast, Toast } from "@raycast/api";
import { CloneOptions, GitRepository } from "../types";
import simpleGit, { SimpleGit } from "simple-git";

const execAsync = promisify(exec);

export function parseGitUrl(url: string): GitRepository | null {
  // GitHub
  const githubMatch = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (githubMatch) {
    return {
      url: url.endsWith(".git") ? url : `${url}.git`,
      name: githubMatch[2].replace(/\.git$/, ""),
      provider: "github",
    };
  }

  // GitLab
  const gitlabMatch = url.match(/gitlab\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (gitlabMatch) {
    return {
      url: url.endsWith(".git") ? url : `${url}.git`,
      name: gitlabMatch[2].replace(/\.git$/, ""),
      provider: "gitlab",
    };
  }

  // Bitbucket
  const bitbucketMatch = url.match(/bitbucket\.org[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (bitbucketMatch) {
    return {
      url: url.endsWith(".git") ? url : `${url}.git`,
      name: bitbucketMatch[2].replace(/\.git$/, ""),
      provider: "bitbucket",
    };
  }

  // Custom Git URL
  if (url.includes("@") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("git://")) {
    const nameMatch = url.match(/([^/]+?)(?:\.git)?\/?$/);
    return {
      url: url.endsWith(".git") ? url : `${url}.git`,
      name: nameMatch ? nameMatch[1].replace(/\.git$/, "") : "repository",
      provider: "custom",
    };
  }

  return null;
}

export function buildAuthenticatedUrl(url: string, token?: string, provider?: string): string {
  if (!token) return url;

  // HTTPS URL with token
  if (url.startsWith("https://")) {
    if (provider === "github") {
      return url.replace("https://", `https://${token}@`);
    } else if (provider === "gitlab") {
      return url.replace("https://", `https://oauth2:${token}@`);
    } else if (provider === "bitbucket") {
      return url.replace("https://", `https://x-token-auth:${token}@`);
    }
    return url.replace("https://", `https://${token}@`);
  }

  return url;
}

export async function cloneRepository(options: CloneOptions): Promise<string> {
  const { url, destination, branch, token } = options;

  try {
    // Ensure destination directory exists
    const expandedDestination = destination.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
    await mkdir(expandedDestination, { recursive: true });

    // Build authenticated URL if token provided
    const repoInfo = parseGitUrl(url);
    const provider = repoInfo?.provider;
    const authenticatedUrl = buildAuthenticatedUrl(url, token, provider);

    // Determine repository name and full path
    const repoName = repoInfo?.name || "repository";
    const repoPath = join(expandedDestination, repoName);

    await showToast({
      style: Toast.Style.Animated,
      title: "Cloning repository",
      message: `Cloning ${url}...`,
    });

    // Use simple-git to clone
    const git: SimpleGit = simpleGit(expandedDestination);
    
    // Clone options
    const cloneOptions: string[] = [];
    if (branch) {
      cloneOptions.push("--branch", branch);
    }

    await git.clone(authenticatedUrl, repoName, cloneOptions);

    await showToast({
      style: Toast.Style.Success,
      title: "Repository cloned",
      message: `Cloned to ${repoPath}`,
    });

    return repoPath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Clone failed",
      message: errorMessage,
    });
    throw error;
  }
}

export async function isRepositoryCloned(destination: string, repoName: string): Promise<boolean> {
  try {
    const expandedDestination = destination.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
    const repoPath = join(expandedDestination, repoName);
    await access(join(repoPath, ".git"));
    return true;
  } catch {
    return false;
  }
}

export async function getRepositoryPath(destination: string, repoName: string): Promise<string | null> {
  try {
    const expandedDestination = destination.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
    const repoPath = join(expandedDestination, repoName);
    await access(join(repoPath, ".git"));
    return repoPath;
  } catch {
    return null;
  }
}

