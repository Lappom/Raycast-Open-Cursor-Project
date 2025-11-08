import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences, GitRepository, Project } from "./types";
import { parseGitUrl, cloneRepository, getRepositoryPath } from "./utils/git-clone";
import { openInCursor, isCursorInstalled } from "./utils/cursor";
import { addToHistory } from "./utils/storage";
import { join } from "path";

export default function CloneRepo() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [repositories, setRepositories] = useState<GitRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cursorInstalled, setCursorInstalled] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    checkCursor();
  }, []);

  async function checkCursor() {
    const installed = await isCursorInstalled();
    setCursorInstalled(installed);
  }

  function handleCloneUrl(url: string) {
    const repo = parseGitUrl(url);
    if (repo) {
      push(<CloneForm repository={repo} preferences={preferences} />);
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Git URL",
        message: "Please enter a valid Git repository URL",
      });
    }
  }

  function getTokenForProvider(provider: string): string | undefined {
    switch (provider) {
      case "github":
        return preferences.githubToken;
      case "gitlab":
        return preferences.gitlabToken;
      case "bitbucket":
        return preferences.bitbucketToken;
      default:
        return undefined;
    }
  }

  async function handleQuickClone(repo: GitRepository) {
    if (!cursorInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not installed",
        message: "Please install Cursor first",
      });
      return;
    }

    setIsLoading(true);
    try {
      const cloneDir = preferences.cloneDirectory || "~/Projects";
      const expandedDir = cloneDir.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");
      const destination = join(expandedDir, repo.name);

      // Check if already cloned
      const existingPath = await getRepositoryPath(expandedDir, repo.name);
      if (existingPath) {
        await openInCursor(existingPath, preferences.openInNewWindow);
        const project: Project = {
          id: existingPath,
          name: repo.name,
          path: existingPath,
          type: "remote",
          gitRemote: repo.url,
        };
        await addToHistory(project);
        showToast({
          style: Toast.Style.Success,
          title: "Opened existing repository",
          message: `Opened ${repo.name}`,
        });
        return;
      }

      // Clone the repository
      const token = getTokenForProvider(repo.provider);
      const clonedPath = await cloneRepository({
        url: repo.url,
        destination: expandedDir,
        token,
      });

      // Open in Cursor
      await openInCursor(clonedPath, preferences.openInNewWindow);

      const project: Project = {
        id: clonedPath,
        name: repo.name,
        path: clonedPath,
        type: "remote",
        gitRemote: repo.url,
        clonedAt: new Date(),
      };
      await addToHistory(project);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Clone failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Parse search text as URL if it looks like one
  useEffect(() => {
    if (searchText && (searchText.includes("github.com") || searchText.includes("gitlab.com") || searchText.includes("bitbucket.org") || searchText.includes("@") || searchText.startsWith("http"))) {
      const repo = parseGitUrl(searchText);
      if (repo && !repositories.find((r) => r.url === repo.url)) {
        setRepositories([repo, ...repositories]);
      }
    }
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter Git repository URL (e.g., https://github.com/user/repo)..."
      onSearchTextChange={setSearchText}
      actions={
        <ActionPanel>
          <Action
            title="Clone Repository"
            icon={Icon.Download}
            onAction={() => {
              if (searchText) {
                handleCloneUrl(searchText);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title="Clone Git Repository"
        description="Enter a Git repository URL to clone and open in Cursor"
      />

      {repositories.map((repo) => {
        const isCloned = false; // Could check this async
        return (
          <List.Item
            key={repo.url}
            title={repo.name}
            subtitle={repo.url}
            icon={Icon.Code}
            accessories={[
              {
                text: repo.provider,
                icon: Icon.Globe,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Clone and Open"
                  icon={Icon.Download}
                  onAction={() => handleQuickClone(repo)}
                />
                <Action
                  title="Clone with Options"
                  icon={Icon.Gear}
                  onAction={() => push(<CloneForm repository={repo} preferences={preferences} />)}
                />
                <Action.CopyToClipboard content={repo.url} title="Copy URL" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function CloneForm({ repository, preferences }: { repository: GitRepository; preferences: Preferences }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [cursorInstalled, setCursorInstalled] = useState(false);

  useEffect(() => {
    checkCursor();
  }, []);

  async function checkCursor() {
    const installed = await isCursorInstalled();
    setCursorInstalled(installed);
  }

  async function handleSubmit(values: { destination: string; branch: string }) {
    if (!cursorInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not installed",
        message: "Please install Cursor first",
      });
      return;
    }

    setIsLoading(true);
    try {
      const cloneDir = values.destination || preferences.cloneDirectory || "~/Projects";
      const expandedDir = cloneDir.replace(/^~/, process.env.HOME || process.env.USERPROFILE || "");

      const token =
        repository.provider === "github"
          ? preferences.githubToken
          : repository.provider === "gitlab"
          ? preferences.gitlabToken
          : repository.provider === "bitbucket"
          ? preferences.bitbucketToken
          : undefined;

      const clonedPath = await cloneRepository({
        url: repository.url,
        destination: expandedDir,
        branch: values.branch || undefined,
        token,
      });

      await openInCursor(clonedPath, preferences.openInNewWindow);

      const project: Project = {
        id: clonedPath,
        name: repository.name,
        path: clonedPath,
        type: "remote",
        gitRemote: repository.url,
        clonedAt: new Date(),
      };
      await addToHistory(project);

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Clone failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Clone and Open"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Repository" text={repository.name} />
      <Form.Description title="URL" text={repository.url} />
      <Form.TextField
        id="destination"
        title="Destination Directory"
        placeholder={preferences.cloneDirectory || "~/Projects"}
        defaultValue={preferences.cloneDirectory || "~/Projects"}
      />
      <Form.TextField
        id="branch"
        title="Branch (optional)"
        placeholder="main"
      />
    </Form>
  );
}

