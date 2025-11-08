import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { platform } from "os";
import { Preferences, Project } from "./types";
import { createProject } from "./utils/project-creator";
import { openInCursor, isCursorInstalled } from "./utils/cursor";
import { addToHistory } from "./utils/storage";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function CreateProject() {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const osPlatform = platform();
  const modifierKey = osPlatform === "win32" ? "ctrl" : "cmd";
  const [isLoading, setIsLoading] = useState(false);
  const [cursorInstalled, setCursorInstalled] = useState(false);
  const [destination, setDestination] = useState<string>(preferences.cloneDirectory || "~/Projects");

  useEffect(() => {
    checkCursor();
  }, []);

  async function checkCursor() {
    const installed = await isCursorInstalled();
    setCursorInstalled(installed);
    if (!installed) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not found",
        message: "Please install Cursor or add it to your PATH",
      });
    }
  }

  async function handleSelectFolder() {
    try {
      const osPlatform = platform();
      let selectedPath: string | null = null;

      if (osPlatform === "darwin") {
        // macOS: Use AppleScript to open folder picker
        const script = `
          tell application "Finder"
            activate
            set folderPath to choose folder with prompt "Select destination folder for your project"
            return POSIX path of folderPath
          end tell
        `;
        const { stdout } = await execAsync(`osascript -e '${script}'`);
        selectedPath = stdout.trim();
      } else if (osPlatform === "win32") {
        // Windows: Use PowerShell to open folder picker
        const script = `Add-Type -AssemblyName System.Windows.Forms; $folderBrowser = New-Object System.Windows.Forms.FolderBrowserDialog; $folderBrowser.Description = 'Select destination folder for your project'; $folderBrowser.ShowNewFolderButton = $true; if ($folderBrowser.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $folderBrowser.SelectedPath }`;
        const { stdout } = await execAsync(`powershell -Command "${script}"`);
        selectedPath = stdout.trim();
      } else {
        // Linux: Try to use zenity or kdialog
        try {
          const { stdout } = await execAsync(`zenity --file-selection --directory --title="Select destination folder"`);
          selectedPath = stdout.trim();
        } catch {
          try {
            const { stdout } = await execAsync(`kdialog --getexistingdirectory --title "Select destination folder"`);
            selectedPath = stdout.trim();
          } catch {
            throw new Error("No folder picker available. Please install zenity or kdialog.");
          }
        }
      }

      if (selectedPath) {
        setDestination(selectedPath);
        showToast({
          style: Toast.Style.Success,
          title: "Folder selected",
          message: selectedPath,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to select folder",
        message: errorMessage,
      });
    }
  }

  async function handleSubmit(values: { projectName: string; destination?: string }) {
    if (!cursorInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not installed",
        message: "Please install Cursor first",
      });
      return;
    }

    if (!values.projectName || values.projectName.trim().length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Project name required",
        message: "Please enter a project name",
      });
      return;
    }

    setIsLoading(true);
    try {
      const finalDestination = values.destination || destination || preferences.cloneDirectory || "~/Projects";
      
      // Create the project
      const projectPath = await createProject({
        projectName: values.projectName.trim(),
        destination: finalDestination,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Project created",
        message: `Created ${values.projectName}`,
      });

      // Open in Cursor
      await openInCursor(projectPath, preferences.openInNewWindow);

      // Add to history
      const project: Project = {
        id: projectPath,
        name: values.projectName.trim(),
        path: projectPath,
        type: "local",
      };
      await addToHistory(project);

      pop();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const defaultDestination = preferences.cloneDirectory || "~/Projects";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Open"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Select Folder"
            icon={Icon.Folder}
            onAction={handleSelectFolder}
            shortcut={{ modifiers: [modifierKey], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="projectName"
        title="Project Name"
        placeholder="my-awesome-project"
        autoFocus
      />
      <Form.TextField
        id="destination"
        title="Destination Directory"
        placeholder={defaultDestination}
        value={destination}
        onChange={setDestination}
        info="Directory where the project will be created"
      />
      <Form.Description
        title="What will be created"
        text="A new directory with Git initialized, README.md, and .gitignore files"
      />
    </Form>
  );
}


