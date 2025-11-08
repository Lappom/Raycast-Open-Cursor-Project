export interface Project {
  id: string;
  name: string;
  path: string;
  type: "local" | "remote";
  lastAccessed?: Date;
  isFavorite?: boolean;
  tags?: string[];
  size?: number;
  gitRemote?: string;
  clonedAt?: Date;
}

export interface ScanResult {
  projects: Project[];
  scannedAt: Date;
}

export interface GitRepository {
  url: string;
  name: string;
  provider: "github" | "gitlab" | "bitbucket" | "custom";
  description?: string;
  defaultBranch?: string;
}

export interface CloneOptions {
  url: string;
  destination: string;
  branch?: string;
  token?: string;
}

export interface Preferences {
  scanDirectories: string;
  scanDepth: string;
  excludedFolders: string;
  cloneDirectory: string;
  githubToken?: string;
  gitlabToken?: string;
  bitbucketToken?: string;
  openInNewWindow: boolean;
}

export interface SSHHost {
  id: string;
  user?: string;
  host: string;
  port?: number;
  alias?: string;
  lastAccessed?: Date;
  isFavorite?: boolean;
}

