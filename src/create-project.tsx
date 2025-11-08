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
import { Preferences, Project } from "./types";
import { createProject } from "./utils/project-creator";
import { openInCursor, isCursorInstalled } from "./utils/cursor";
import { addToHistory } from "./utils/storage";

export default function CreateProject() {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cursorInstalled, setCursorInstalled] = useState(false);

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

  async function handleSubmit(values: { projectName: string; destination: string }) {
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
      const destination = values.destination || preferences.cloneDirectory || "~/Projects";
      
      // Create the project
      const projectPath = await createProject({
        projectName: values.projectName.trim(),
        destination,
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
        defaultValue={defaultDestination}
        info="Directory where the project will be created"
      />
      <Form.Description
        title="What will be created"
        text="A new directory with Git initialized, README.md, and .gitignore files"
      />
    </Form>
  );
}

