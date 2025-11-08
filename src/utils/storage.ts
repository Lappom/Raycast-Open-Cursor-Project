import { LocalStorage } from "@raycast/api";
import { Project, SSHHost } from "../types";

const FAVORITES_KEY = "favorites";
const HISTORY_KEY = "history";
const CACHE_KEY = "project-cache";
const CACHE_TIMESTAMP_KEY = "cache-timestamp";
const SSH_FAVORITES_KEY = "ssh-favorites";
const SSH_HISTORY_KEY = "ssh-history";

const MAX_HISTORY_ITEMS = 50;
const MAX_SSH_HISTORY_ITEMS = 50;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getFavorites(): Promise<Project[]> {
  try {
    const favoritesJson = await LocalStorage.getItem(FAVORITES_KEY);
    if (!favoritesJson) return [];
    return JSON.parse(favoritesJson as string);
  } catch {
    return [];
  }
}

export async function addFavorite(project: Project): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.find((p) => p.id === project.id)) {
    favorites.push({ ...project, isFavorite: true });
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export async function removeFavorite(projectId: string): Promise<void> {
  const favorites = await getFavorites();
  const filtered = favorites.filter((p) => p.id !== projectId);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
}

export async function isFavorite(projectId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((p) => p.id === projectId);
}

export async function getHistory(): Promise<Project[]> {
  try {
    const historyJson = await LocalStorage.getItem(HISTORY_KEY);
    if (!historyJson) return [];
    return JSON.parse(historyJson as string);
  } catch {
    return [];
  }
}

export async function addToHistory(project: Project): Promise<void> {
  const history = await getHistory();
  const existingIndex = history.findIndex((p) => p.id === project.id);
  
  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }
  
  history.unshift({
    ...project,
    lastAccessed: new Date(),
  });
  
  // Keep only the most recent items
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function removeFromHistory(projectId: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((p) => p.id !== projectId);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function getCachedProjects(): Promise<Project[] | null> {
  try {
    const timestamp = await LocalStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    
    const cacheAge = Date.now() - (timestamp as number);
    if (cacheAge > CACHE_DURATION_MS) {
      return null; // Cache expired
    }
    
    const cacheJson = await LocalStorage.getItem(CACHE_KEY);
    if (!cacheJson) return null;
    
    return JSON.parse(cacheJson as string);
  } catch {
    return null;
  }
}

export async function setCachedProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(projects));
  await LocalStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
}

export async function clearCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
  await LocalStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

// SSH Host storage functions
export async function getSSHFavorites(): Promise<SSHHost[]> {
  try {
    const favoritesJson = await LocalStorage.getItem(SSH_FAVORITES_KEY);
    if (!favoritesJson) return [];
    return JSON.parse(favoritesJson as string);
  } catch {
    return [];
  }
}

export async function addSSHFavorite(host: SSHHost): Promise<void> {
  const favorites = await getSSHFavorites();
  if (!favorites.find((h) => h.id === host.id)) {
    favorites.push({ ...host, isFavorite: true });
    await LocalStorage.setItem(SSH_FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export async function removeSSHFavorite(hostId: string): Promise<void> {
  const favorites = await getSSHFavorites();
  const filtered = favorites.filter((h) => h.id !== hostId);
  await LocalStorage.setItem(SSH_FAVORITES_KEY, JSON.stringify(filtered));
}

export async function isSSHFavorite(hostId: string): Promise<boolean> {
  const favorites = await getSSHFavorites();
  return favorites.some((h) => h.id === hostId);
}

export async function getSSHHistory(): Promise<SSHHost[]> {
  try {
    const historyJson = await LocalStorage.getItem(SSH_HISTORY_KEY);
    if (!historyJson) return [];
    return JSON.parse(historyJson as string);
  } catch {
    return [];
  }
}

export async function addToSSHHistory(host: SSHHost): Promise<void> {
  const history = await getSSHHistory();
  const existingIndex = history.findIndex((h) => h.id === host.id);
  
  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }
  
  history.unshift({
    ...host,
    lastAccessed: new Date(),
  });
  
  // Keep only the most recent items
  const trimmed = history.slice(0, MAX_SSH_HISTORY_ITEMS);
  await LocalStorage.setItem(SSH_HISTORY_KEY, JSON.stringify(trimmed));
}

export async function removeFromSSHHistory(hostId: string): Promise<void> {
  const history = await getSSHHistory();
  const filtered = history.filter((h) => h.id !== hostId);
  await LocalStorage.setItem(SSH_HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearSSHHistory(): Promise<void> {
  await LocalStorage.removeItem(SSH_HISTORY_KEY);
}

export async function updateSSHFavorite(oldHostId: string, updatedHost: SSHHost): Promise<void> {
  const favorites = await getSSHFavorites();
  const index = favorites.findIndex((h) => h.id === oldHostId);
  if (index >= 0) {
    favorites[index] = { ...updatedHost, isFavorite: true };
    await LocalStorage.setItem(SSH_FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export async function updateSSHHistory(oldHostId: string, updatedHost: SSHHost): Promise<void> {
  const history = await getSSHHistory();
  const index = history.findIndex((h) => h.id === oldHostId);
  if (index >= 0) {
    history[index] = updatedHost;
    await LocalStorage.setItem(SSH_HISTORY_KEY, JSON.stringify(history));
  }
}

