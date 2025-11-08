import { readdir, stat, access } from "fs/promises";
import { join, basename } from "path";
import { Project, Preferences } from "../types";
import { getCachedProjects, setCachedProjects } from "./storage";

const PROJECT_INDICATORS = [
  ".git",
  "package.json",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "requirements.txt",
  "setup.py",
  "pyproject.toml",
  "go.mod",
  "composer.json",
  "Gemfile",
  "mix.exs",
  "project.clj",
  "deps.edn",
  "tsconfig.json",
  "angular.json",
  "vue.config.js",
  "vite.config.js",
  "webpack.config.js",
  ".vscode",
  ".idea",
];

function isProjectDirectory(dirPath: string): Promise<boolean> {
  return Promise.all(
    PROJECT_INDICATORS.map((indicator) =>
      access(join(dirPath, indicator))
        .then(() => true)
        .catch(() => false)
    )
  ).then((results) => results.some((exists) => exists));
}

function shouldExcludeFolder(folderName: string, excludedFolders: string[]): boolean {
  return excludedFolders.some((excluded) => 
    folderName.toLowerCase().includes(excluded.toLowerCase().trim())
  );
}

async function scanDirectory(
  dirPath: string,
  maxDepth: number,
  currentDepth: number,
  excludedFolders: string[],
  foundProjects: Project[]
): Promise<void> {
  if (currentDepth > maxDepth) {
    return;
  }

  try {
    const entries = await readdir(dirPath);
    const dirName = basename(dirPath);

    // Skip excluded folders
    if (shouldExcludeFolder(dirName, excludedFolders)) {
      return;
    }

    // Check if current directory is a project
    if (await isProjectDirectory(dirPath)) {
      try {
        const stats = await stat(dirPath);
        foundProjects.push({
          id: dirPath,
          name: dirName,
          path: dirPath,
          type: "local",
          size: stats.size,
        });
        return; // Don't scan inside project directories
      } catch {
        // Ignore errors
      }
    }

    // Recursively scan subdirectories
    if (currentDepth < maxDepth) {
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        try {
          const stats = await stat(fullPath);
          if (stats.isDirectory() && !shouldExcludeFolder(entry, excludedFolders)) {
            await scanDirectory(fullPath, maxDepth, currentDepth + 1, excludedFolders, foundProjects);
          }
        } catch {
          // Ignore permission errors and continue
        }
      }
    }
  } catch {
    // Ignore errors (permission denied, etc.)
  }
}

export async function scanProjects(preferences: Preferences): Promise<Project[]> {
  // Check cache first
  const cached = await getCachedProjects();
  if (cached) {
    return cached;
  }

  const projects: Project[] = [];
  const scanDepth = parseInt(preferences.scanDepth) || 3;
  const excludedFolders = preferences.excludedFolders
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  const directoriesToScan = preferences.scanDirectories
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  // Default directories if none specified
  const defaultDirectories: string[] = [];
  if (process.platform === "win32") {
    defaultDirectories.push(
      join(process.env.USERPROFILE || "", "Documents"),
      join(process.env.USERPROFILE || "", "Desktop"),
      join(process.env.USERPROFILE || "", "Projects")
    );
  } else {
    defaultDirectories.push(
      join(process.env.HOME || "", "Documents"),
      join(process.env.HOME || "", "Desktop"),
      join(process.env.HOME || "", "Projects"),
      join(process.env.HOME || "", "projects")
    );
  }

  const directories = directoriesToScan.length > 0 ? directoriesToScan : defaultDirectories;

  // Scan each directory
  for (const dir of directories) {
    try {
      const expandedPath = dir.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
      await scanDirectory(expandedPath, scanDepth, 0, excludedFolders, projects);
    } catch {
      // Ignore errors for individual directories
    }
  }

  // Cache the results
  await setCachedProjects(projects);

  return projects;
}

export function generateProjectId(path: string): string {
  return path;
}

