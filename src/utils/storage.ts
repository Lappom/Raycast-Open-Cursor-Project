import { LocalStorage } from "@raycast/api";
import { Project } from "../types";

const FAVORITES_KEY = "favorites";
const HISTORY_KEY = "history";
const CACHE_KEY = "project-cache";
const CACHE_TIMESTAMP_KEY = "cache-timestamp";

const MAX_HISTORY_ITEMS = 50;
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

