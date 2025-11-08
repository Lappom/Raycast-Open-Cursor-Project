import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Color,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Preferences, SSHHost } from "./types";
import { parseSSHString, formatSSHString, formatCursorRemoteURI } from "./utils/ssh-parser";
import { openInCursorSSH, isCursorInstalled } from "./utils/cursor";
import {
  getSSHFavorites,
  addSSHFavorite,
  removeSSHFavorite,
  getSSHHistory,
  addToSSHHistory,
  removeFromSSHHistory,
  updateSSHFavorite,
  updateSSHHistory,
  isSSHFavorite,
} from "./utils/storage";
import { Clipboard } from "@raycast/api";

export default function ConnectSSH() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [hosts, setHosts] = useState<SSHHost[]>([]);
  const [favorites, setFavorites] = useState<SSHHost[]>([]);
  const [history, setHistory] = useState<SSHHost[]>([]);
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

  async function loadData() {
    setIsLoading(true);
    try {
      const [favs, hist] = await Promise.all([
        getSSHFavorites(),
        getSSHHistory(),
      ]);

      // Create a set of favorite IDs for quick lookup
      const favoriteIds = new Set(favs.map((h) => h.id));

      // Merge favorites and history
      const allHosts: SSHHost[] = [];
      const hostMap = new Map<string, SSHHost>();

      // Add favorites with isFavorite: true
      favs.forEach((host) => {
        hostMap.set(host.id, { ...host, isFavorite: true });
      });

      // Add history (merge with favorites)
      hist.forEach((host) => {
        const existing = hostMap.get(host.id);
        if (existing) {
          hostMap.set(host.id, { ...existing, lastAccessed: host.lastAccessed });
        } else {
          // Set isFavorite based on whether it's in favorites
          hostMap.set(host.id, { ...host, isFavorite: favoriteIds.has(host.id) });
        }
      });

      // Ensure all hosts have correct isFavorite status
      const finalHosts = Array.from(hostMap.values()).map((host) => ({
        ...host,
        isFavorite: favoriteIds.has(host.id),
      }));

      setFavorites(favs);
      setHistory(hist);
      setHosts(finalHosts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load SSH hosts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect(host: SSHHost) {
    if (!cursorInstalled) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cursor not installed",
        message: "Please install Cursor first",
      });
      return;
    }

    try {
      await openInCursorSSH(host);
      await addToSSHHistory(host);
      await loadData(); // Refresh to update history
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleToggleFavorite(host: SSHHost) {
    try {
      // Check actual favorite status in storage
      const isFavorite = await isSSHFavorite(host.id);
      
      if (isFavorite) {
        await removeSSHFavorite(host.id);
        showToast({
          style: Toast.Style.Success,
          title: "Removed from favorites",
          message: `Removed ${formatSSHString(host)} from favorites`,
        });
      } else {
        await addSSHFavorite(host);
        showToast({
          style: Toast.Style.Success,
          title: "Added to favorites",
          message: `Added ${formatSSHString(host)} to favorites`,
        });
      }
      
      // Reload data to refresh the list
      await loadData();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update favorites",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopyConnectionString(host: SSHHost) {
    const connectionString = formatSSHString(host);
    await Clipboard.copy(connectionString);
    showToast({
      style: Toast.Style.Success,
      title: "Connection string copied",
      message: connectionString,
    });
  }

  async function handleCopyRemoteURI(host: SSHHost) {
    const remoteURI = formatCursorRemoteURI(host);
    await Clipboard.copy(remoteURI);
    showToast({
      style: Toast.Style.Success,
      title: "Remote URI copied",
      message: remoteURI,
    });
  }

  async function handleEditHost(oldHost: SSHHost, updatedHost: SSHHost) {
    try {
      const idChanged = oldHost.id !== updatedHost.id;
      const hist = await getSSHHistory();
      const wasInHistory = hist.some((h) => h.id === oldHost.id);

      // If ID changed, remove old entries
      if (idChanged) {
        if (oldHost.isFavorite) {
          await removeSSHFavorite(oldHost.id);
        }
        if (wasInHistory) {
          await removeFromSSHHistory(oldHost.id);
        }
      }

      // Update or add in favorites
      if (oldHost.isFavorite) {
        if (idChanged) {
          await addSSHFavorite(updatedHost);
        } else {
          await updateSSHFavorite(oldHost.id, updatedHost);
        }
      } else if (updatedHost.isFavorite) {
        await addSSHFavorite(updatedHost);
      }

      // Remove from favorites if unchecked
      if (!updatedHost.isFavorite && oldHost.isFavorite) {
        await removeSSHFavorite(idChanged ? oldHost.id : updatedHost.id);
      }

      // Update or add in history
      if (wasInHistory) {
        if (idChanged) {
          await addToSSHHistory(updatedHost);
        } else {
          await updateSSHHistory(oldHost.id, updatedHost);
        }
      } else if (updatedHost.lastAccessed) {
        await addToSSHHistory(updatedHost);
      }

      // Reload data to refresh the list
      await loadData();
      
      // Small delay to ensure React has time to update the UI
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      showToast({
        style: Toast.Style.Success,
        title: "Host updated",
        message: `Updated ${formatSSHString(updatedHost)}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update host",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error; // Re-throw to prevent pop() in form
    }
  }

  function filterHosts(hostList: SSHHost[]): SSHHost[] {
    if (!searchText) return hostList;

    const searchLower = searchText.toLowerCase();
    return hostList.filter(
      (host) =>
        host.host.toLowerCase().includes(searchLower) ||
        host.user?.toLowerCase().includes(searchLower) ||
        host.alias?.toLowerCase().includes(searchLower) ||
        formatSSHString(host).toLowerCase().includes(searchLower)
    );
  }

  function getDisplayHosts(): SSHHost[] {
    let source: SSHHost[] = [];

    if (selectedSection === "favorites") {
      source = favorites;
    } else if (selectedSection === "history") {
      source = history;
    } else {
      // Combine all hosts, prioritizing parsed search text
      const parsed = searchText ? parseSSHString(searchText) : null;
      if (parsed && !hosts.find((h) => h.id === parsed.id)) {
        source = [parsed, ...hosts];
      } else {
        source = hosts;
      }
    }

    return filterHosts(source);
  }

  const displayHosts = getDisplayHosts();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter SSH host (e.g., user@host or host:port)..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter hosts"
          value={selectedSection}
          onChange={(newValue) => setSelectedSection(newValue as typeof selectedSection)}
        >
          <List.Dropdown.Item title="All Hosts" value="all" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          <List.Dropdown.Item title="Recent" value="history" />
        </List.Dropdown>
      }
    >
      {displayHosts.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No SSH hosts found"
          description="Enter an SSH host (e.g., user@host or host:port) to connect"
        />
      )}

      {displayHosts.map((host) => {
        const connectionString = formatSSHString(host);
        const displayName = host.alias || connectionString;
        
        return (
          <List.Item
            key={host.id}
            title={displayName}
            subtitle={host.alias ? connectionString : undefined}
            icon={host.isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Terminal}
            accessories={[
              {
                text: host.port ? `Port ${host.port}` : "Default port",
                icon: Icon.Network,
              },
              ...(host.lastAccessed
                ? [
                    {
                      text: new Date(host.lastAccessed).toLocaleDateString(),
                      icon: Icon.Clock,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Connect to Host"
                  icon={Icon.ArrowRight}
                  onAction={() => handleConnect(host)}
                />
                <Action
                  title={host.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  icon={host.isFavorite ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleToggleFavorite(host)}
                />
                <Action
                  title="Copy Connection String"
                  icon={Icon.Clipboard}
                  onAction={() => handleCopyConnectionString(host)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Copy Remote URI"
                  icon={Icon.Clipboard}
                  onAction={() => handleCopyRemoteURI(host)}
                />
                <Action
                  title="Edit Host"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditHostForm host={host} onSave={handleEditHost} />)}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                {selectedSection === "history" && (
                  <Action
                    title="Remove from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await removeFromSSHHistory(host.id);
                      await loadData();
                    }}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadData}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function EditHostForm({
  host,
  onSave,
}: {
  host: SSHHost;
  onSave: (oldHost: SSHHost, updatedHost: SSHHost) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: {
    alias?: string;
    user?: string;
    host: string;
    port?: string;
    isFavorite?: boolean;
  }) {
    setIsLoading(true);
    try {
      const port = values.port ? parseInt(values.port, 10) : undefined;
      if (values.port && isNaN(port!)) {
        throw new Error("Port must be a valid number");
      }

      const updatedHost: SSHHost = {
        id: values.user
          ? port
            ? `${values.user}@${values.host}:${port}`
            : `${values.user}@${values.host}`
          : port
          ? `${values.host}:${port}`
          : values.host,
        user: values.user || undefined,
        host: values.host,
        port: port,
        alias: values.alias || undefined,
        isFavorite: values.isFavorite ?? host.isFavorite,
        lastAccessed: host.lastAccessed,
      };

      await onSave(host, updatedHost);
      // Pop after successful save (loadData is called in onSave)
      pop();
    } catch (error) {
      // Error is already handled in onSave, but we don't pop on error
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Host" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Edit SSH Host" text="Update the connection details for this SSH host" />
      <Form.TextField
        id="alias"
        title="Alias (optional)"
        placeholder="My Server"
        defaultValue={host.alias}
        info="A friendly name for this host"
      />
      <Form.TextField
        id="user"
        title="User"
        placeholder="username"
        defaultValue={host.user}
        info="SSH username (leave empty to use system default)"
      />
      <Form.TextField
        id="host"
        title="Host"
        placeholder="example.com or 192.168.1.1"
        defaultValue={host.host}
        info="Hostname or IP address"
      />
      <Form.TextField
        id="port"
        title="Port (optional)"
        placeholder="22"
        defaultValue={host.port?.toString()}
        info="SSH port (default: 22)"
      />
      <Form.Checkbox
        id="isFavorite"
        label="Add to Favorites"
        defaultValue={host.isFavorite}
      />
    </Form>
  );
}

