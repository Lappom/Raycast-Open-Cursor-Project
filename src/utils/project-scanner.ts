import { readdir, stat, access } from "fs/promises";
import { join, basename } from "path";
import { Project, Preferences } from "../types";
import { getCachedProjects, setCachedProjects } from "./storage";

async function getLatestFileModification(dirPath: string, excludedFolders: string[], maxDepth: number = 2): Promise<Date | null> {
  let latestDate: Date | null = null;
  
  async function scanForLatestFile(currentPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    
    try {
      const entries = await readdir(currentPath);
      
      for (const entry of entries) {
        if (shouldExcludeFolder(entry, excludedFolders)) {
          continue;
        }
        
        const fullPath = join(currentPath, entry);
        try {
          const stats = await stat(fullPath);
          
          // Update latest date if this file/directory is more recent
          if (stats.mtime && (!latestDate || stats.mtime > latestDate)) {
            latestDate = stats.mtime;
          }
          
          // Recursively scan subdirectories
          if (stats.isDirectory() && depth < maxDepth) {
            await scanForLatestFile(fullPath, depth + 1);
          }
        } catch {
          // Ignore errors and continue
        }
      }
    } catch {
      // Ignore errors
    }
  }
  
  await scanForLatestFile(dirPath, 0);
  return latestDate;
}

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
  // Removed .vscode and .idea as they are IDE config folders
  // that can exist in any directory, not just projects
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

async function hasSubProjects(dirPath: string, excludedFolders: string[]): Promise<boolean> {
  try {
    const entries = await readdir(dirPath);
    
    // Check each entry to see if it's a sub-project
    for (const entry of entries) {
      if (shouldExcludeFolder(entry, excludedFolders)) {
        continue;
      }
      
      const fullPath = join(dirPath, entry);
      try {
        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          // Check if this subdirectory is a project
          const isSubProject = await isProjectDirectory(fullPath);
          if (isSubProject) {
            // Found at least one sub-project, this is a parent directory
            return true;
          }
        }
      } catch {
        // Ignore errors and continue checking
      }
    }
    
    return false;
  } catch {
    return false;
  }
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

    // First, check if this directory contains sub-projects
    // If it does, it's a parent directory and should not be treated as a project
    const hasSubs = await hasSubProjects(dirPath, excludedFolders);
    
    if (hasSubs) {
      // This is a parent directory with sub-projects, skip it as a project
      // but continue scanning inside
    } else {
      // Check if current directory is a project (only if it doesn't have sub-projects)
      const isProject = await isProjectDirectory(dirPath);
      
      if (isProject) {
        // It's a project, not a parent directory
        try {
          const stats = await stat(dirPath);
          
          // Get the latest file modification date within the project
          const latestModification = await getLatestFileModification(dirPath, excludedFolders, 2);
          
          foundProjects.push({
            id: dirPath,
            name: dirName,
            path: dirPath,
            type: "local",
            size: stats.size,
            lastModified: latestModification || stats.mtime,
          });
          return; // Don't scan inside project directories
        } catch {
          // Ignore errors
        }
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

