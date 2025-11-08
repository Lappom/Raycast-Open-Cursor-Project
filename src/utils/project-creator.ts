import { mkdir, writeFile, access } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CreateProjectOptions {
  projectName: string;
  destination: string;
}

const README_TEMPLATE = (projectName: string) => `# ${projectName}

## Description

## Getting Started

## Installation

## Usage
`;

const GITIGNORE_TEMPLATE = `# Dependencies
node_modules/
vendor/
venv/
env/
.venv/

# Build outputs
build/
dist/
*.egg-info/
*.pyc
__pycache__/
.next/
out/
.cache/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temporary files
tmp/
temp/
*.tmp
`;

export async function createProject(options: CreateProjectOptions): Promise<string> {
  const { projectName, destination } = options;
  
  // Expand ~ in destination path
  const expandedDestination = destination.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
  const projectPath = join(expandedDestination, projectName);

  // Check if directory already exists
  try {
    await access(projectPath);
    throw new Error(`Directory already exists: ${projectPath}`);
  } catch (error: any) {
    // If error is not "file not found" (ENOENT), rethrow
    if (error && error.code !== "ENOENT") {
      throw error;
    }
    // Directory doesn't exist, which is what we want
  }

  // Create project directory
  await mkdir(projectPath, { recursive: true });

  // Initialize Git repository
  try {
    await execAsync("git init", { cwd: projectPath });
  } catch (error) {
    // If git is not installed, continue without git init
    // The project will still be created
  }

  // Create README.md
  const readmePath = join(projectPath, "README.md");
  await writeFile(readmePath, README_TEMPLATE(projectName), "utf-8");

  // Create .gitignore
  const gitignorePath = join(projectPath, ".gitignore");
  await writeFile(gitignorePath, GITIGNORE_TEMPLATE, "utf-8");

  return projectPath;
}

