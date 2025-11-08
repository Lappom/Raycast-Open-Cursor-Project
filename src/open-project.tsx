import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { platform } from "os";
import { Project, Preferences } from "./types";
import { scanProjects } from "./utils/project-scanner";
import { openInCursor, isCursorInstalled } from "./utils/cursor";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  getHistory,
  addToHistory,
  removeFromHistory,
  clearCache,
} from "./utils/storage";
import { Clipboard } from "@raycast/api";

export default function OpenProject() {
  const preferences = getPreferenceValues<Preferences>();
  const osPlatform = platform();
  const modifierKey = osPlatform === "win32" ? "ctrl" : "cmd";
  const [projects, setProjects] = useState<Project[]>([]);
  const [favorites, setFavorites] = useState<Project[]>([]);
  const [history, setHistory] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [cursorInstalled, setCursorInstalled] = useState(false);
  const [selectedSection, setSelectedSection] = useState<"all" | "favorites" | "history">("all");

  useEffect(() => {
    checkCursor();
    loadData();
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

  async function loadData(forceRefresh: boolean = false) {
    setIsLoading(true);
    try {
      // Clear cache if force refresh is requested
      if (forceRefresh) {
        await clearCache();
      }
      
      const [scannedProjects, favs, hist] = await Promise.all([
        scanProjects(preferences),
        getFavorites(),
        getHistory(),
      ]);

      // Merge favorites and history info
      const projectsWithMetadata = scannedProjects.map((project) => {
        const favorite = favs.find((f) => f.id === project.id);
        const historyItem = hist.find((h) => h.id === project.id);
        return {
          ...project,
          isFavorite: !!favorite,
          lastAccessed: historyItem?.lastAccessed,
        };
      });

      setProjects(projectsWithMetadata);
      setFavorites(favs);
      setHistory(hist);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpenProject(project: Project) {
    if (!cursorInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not installed",
        message: "Please install Cursor first",
      });
      return;
    }

    try {
      await openInCursor(project.path, preferences.openInNewWindow);
      await addToHistory(project);
      await loadData(); // Refresh to update history
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleToggleFavorite(project: Project) {
    try {
      if (project.isFavorite) {
        await removeFavorite(project.id);
      } else {
        await addFavorite(project);
      }
      await loadData();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopyPath(project: Project) {
    await Clipboard.copy(project.path);
    showToast({
      style: Toast.Style.Success,
      title: "Path copied",
      message: project.path,
    });
  }

  function filterProjects(projectList: Project[]): Project[] {
    if (!searchText) return projectList;

    const searchLower = searchText.toLowerCase();
    return projectList.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        project.path.toLowerCase().includes(searchLower)
    );
  }

  function getDisplayProjects(): Project[] {
    let source: Project[] = [];

    if (selectedSection === "favorites") {
      source = favorites;
    } else if (selectedSection === "history") {
      source = history;
    } else {
      source = projects;
    }

    const filtered = filterProjects(source);
    
    // Sort: favorites first, then by last modified date, then alphabetically
    return filtered.sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then by last modified date (most recent first)
      if (a.lastModified && b.lastModified) {
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
      if (a.lastModified && !b.lastModified) return -1;
      if (!a.lastModified && b.lastModified) return 1;
      
      // Finally alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }

  const displayProjects = getDisplayProjects();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter projects"
          value={selectedSection}
          onChange={(newValue) => setSelectedSection(newValue as typeof selectedSection)}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          <List.Dropdown.Item title="Recent" value="history" />
        </List.Dropdown>
      }
    >
      {displayProjects.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects found"
          description="Try adjusting your scan directories in preferences"
        />
      )}

      {displayProjects.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          subtitle={project.path}
          icon={project.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Folder}
          accessories={[
            {
              text: project.type,
              icon: project.type === "local" ? Icon.Folder : Icon.Globe,
            },
            ...(project.lastAccessed
              ? [
                  {
                    text: new Date(project.lastAccessed).toLocaleDateString(),
                    icon: Icon.Clock,
                  },
                ]
              : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in Cursor"
                icon={Icon.ArrowRight}
                onAction={() => handleOpenProject(project)}
              />
              <Action
                title={project.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={project.isFavorite ? Icon.StarDisabled : Icon.Star}
                onAction={() => handleToggleFavorite(project)}
              />
              <Action
                title="Copy Path"
                icon={Icon.Clipboard}
                onAction={() => handleCopyPath(project)}
                shortcut={{ modifiers: [modifierKey], key: "c" }}
              />
              {selectedSection === "history" && (
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await removeFromHistory(project.id);
                    await loadData();
                  }}
                />
              )}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => loadData(true)}
                shortcut={{ modifiers: [modifierKey], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

