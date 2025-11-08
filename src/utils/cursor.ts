import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";
import { showToast, Toast } from "@raycast/api";
import * as path from "path";

const execAsync = promisify(exec);

export async function isCursorInstalled(): Promise<boolean> {
  try {
    const osPlatform = platform();
    let command: string;

    if (osPlatform === "win32") {
      // Check if cursor command exists
      command = "where cursor";
    } else if (osPlatform === "darwin") {
      command = "which cursor";
    } else {
      command = "which cursor";
    }

    await execAsync(command);
    return true;
  } catch {
    return false;
  }
}

export async function openInCursor(projectPath: string, newWindow: boolean = true): Promise<void> {
  try {
    const osPlatform = platform();
    let command: string;

    const normalizedPath = path.resolve(projectPath);

    if (osPlatform === "win32") {
      // Windows: use cursor command or try direct path
      if (newWindow) {
        command = `cursor "${normalizedPath}" --new-window`;
      } else {
        command = `cursor "${normalizedPath}"`;
      }
    } else {
      // macOS and Linux
      if (newWindow) {
        command = `cursor "${normalizedPath}" --new-window`;
      } else {
        command = `cursor "${normalizedPath}"`;
      }
    }

    await execAsync(command);
    
    await showToast({
      style: Toast.Style.Success,
      title: "Opening in Cursor",
      message: `Opening ${path.basename(normalizedPath)}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try alternative methods
    try {
      const osPlatform = platform();
      let altCommand: string;
      const normalizedPath = path.resolve(projectPath);

      if (osPlatform === "win32") {
        // Try with full path to cursor.exe
        altCommand = `"C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Programs\\cursor\\Cursor.exe" "${normalizedPath}"`;
      } else if (osPlatform === "darwin") {
        altCommand = `open -a Cursor "${normalizedPath}"`;
      } else {
        altCommand = `cursor "${normalizedPath}"`;
      }

      await execAsync(altCommand);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Opening in Cursor",
        message: `Opening ${path.basename(normalizedPath)}`,
      });
    } catch (altError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open in Cursor",
        message: errorMessage,
      });
      throw altError;
    }
  }
}

export async function getCursorPath(): Promise<string | null> {
  try {
    const osPlatform = platform();
    let command: string;

    if (osPlatform === "win32") {
      command = "where cursor";
    } else {
      command = "which cursor";
    }

    const { stdout } = await execAsync(command);
    return stdout.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}

export async function openInCursorSSH(sshHost: { user?: string; host: string; port?: number }): Promise<void> {
  try {
    // Build SSH connection string
    const userPart = sshHost.user ? `${sshHost.user}@` : "";
    const portPart = sshHost.port ? `:${sshHost.port}` : "";
    const connectionString = `${userPart}${sshHost.host}${portPart}`;
    const remoteURI = `ssh-remote+${connectionString}`;

    const osPlatform = platform();
    let command: string;

    if (osPlatform === "win32") {
      command = `cursor --remote ${remoteURI}`;
    } else {
      command = `cursor --remote ${remoteURI}`;
    }

    await execAsync(command);
    
    await showToast({
      style: Toast.Style.Success,
      title: "Connecting to SSH host",
      message: `Connecting to ${connectionString}...`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try alternative methods
    try {
      const osPlatform = platform();
      let altCommand: string;

      const userPart = sshHost.user ? `${sshHost.user}@` : "";
      const portPart = sshHost.port ? `:${sshHost.port}` : "";
      const connectionString = `${userPart}${sshHost.host}${portPart}`;
      const remoteURI = `ssh-remote+${connectionString}`;

      if (osPlatform === "win32") {
        altCommand = `"C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Programs\\cursor\\Cursor.exe" --remote ${remoteURI}`;
      } else if (osPlatform === "darwin") {
        altCommand = `open -a Cursor --args --remote ${remoteURI}`;
      } else {
        altCommand = `cursor --remote ${remoteURI}`;
      }

      await execAsync(altCommand);
      
      await showToast({
        style: Toast.Style.Success,
        title: "Connecting to SSH host",
        message: `Connecting to ${connectionString}...`,
      });
    } catch (altError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to SSH host",
        message: errorMessage,
      });
      throw altError;
    }
  }
}

