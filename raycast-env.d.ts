/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Directories to Scan - Comma-separated list of directories to scan for projects (e.g., ~/Documents, ~/Desktop) */
  "scanDirectories": string,
  /** Scan Depth - Maximum depth for recursive scanning (default: 3) */
  "scanDepth": string,
  /** Excluded Folders - Comma-separated list of folder names to exclude (e.g., node_modules,.git,vendor) */
  "excludedFolders": string,
  /** Default Clone Directory - Directory where cloned repositories will be saved */
  "cloneDirectory": string,
  /** GitHub Token - Personal access token for GitHub (optional) */
  "githubToken"?: string,
  /** GitLab Token - Personal access token for GitLab (optional) */
  "gitlabToken"?: string,
  /** Bitbucket Token - Personal access token for Bitbucket (optional) */
  "bitbucketToken"?: string,
  /** Open in New Window - Always open projects in a new Cursor window */
  "openInNewWindow": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `open-project` command */
  export type OpenProject = ExtensionPreferences & {}
  /** Preferences accessible in the `clone-repo` command */
  export type CloneRepo = ExtensionPreferences & {}
  /** Preferences accessible in the `create-project` command */
  export type CreateProject = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `open-project` command */
  export type OpenProject = {}
  /** Arguments passed to the `clone-repo` command */
  export type CloneRepo = {}
  /** Arguments passed to the `create-project` command */
  export type CreateProject = {}
}

