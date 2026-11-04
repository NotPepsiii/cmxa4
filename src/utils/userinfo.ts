import { UserProfile, WatchHistoryItem, WatchlistItem } from "../types";

export const ACTIVE_USER_SESSION_KEY = "pepflick_active_user_id";
export const BACKUP_USER_STORAGE_KEY = "pepflick_user_cache";

/**
 * Fetch all profiles currently stored in userinfo.json on the server
 */
export async function fetchServerProfiles(): Promise<{ exists: boolean; profiles: UserProfile[] }> {
  try {
    const res = await fetch("/api/userinfo/profiles");
    if (res.ok) {
      const data = await res.json();
      return {
        exists: data.exists,
        profiles: data.profiles || []
      };
    }
  } catch (err) {
    console.warn("Could not fetch profiles from server, checking local cache:", err);
  }

  // Fallback to local cache if offline
  try {
    const cached = localStorage.getItem(BACKUP_USER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { exists: true, profiles: Object.values(parsed) };
    }
  } catch (e) {
    // Ignore
  }

  return { exists: false, profiles: [] };
}

/**
 * Creates a new user profile on the server, appending it onto userinfo.json
 */
export async function createProfileOnServer(params: {
  name: string;
  password: string;
  avatar: string;
  avatarSource: "pc" | "google" | "preset";
}): Promise<UserProfile> {
  const res = await fetch("/api/userinfo/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create profile on server.");
  }

  // Cache locally
  cacheUserLocally(data.user);
  return data.user;
}

/**
 * Authenticates with a profile's unique password
 */
export async function loginProfileOnServer(params: {
  userId?: string;
  name?: string;
  password: string;
}): Promise<UserProfile> {
  const res = await fetch("/api/userinfo/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login verification failed.");
  }

  cacheUserLocally(data.user);
  return data.user;
}

/**
 * Syncs user data (recentlyWatched, continueWatching, watchlist, profile info) directly to userinfo.json on disk
 */
export async function syncUserDataToServer(
  userId: string,
  updates: {
    recentlyWatched?: WatchHistoryItem[];
    continueWatching?: WatchHistoryItem[];
    watchlist?: WatchlistItem[];
    name?: string;
    avatar?: string;
    avatarSource?: "pc" | "google" | "preset";
    password?: string;
  }
): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/userinfo/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    });

    if (res.ok) {
      const data = await res.json();
      cacheUserLocally(data.user);
      return data.user;
    }
  } catch (err) {
    console.error("Failed to sync user data to userinfo.json:", err);
  }
  return null;
}

/**
 * Direct download of the live userinfo.json file from the server
 */
export function downloadServerUserInfoFile(): void {
  const link = document.createElement("a");
  link.href = "/api/userinfo/raw";
  link.download = "userinfo.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Local cache helper
 */
function cacheUserLocally(user: UserProfile) {
  try {
    const raw = localStorage.getItem(BACKUP_USER_STORAGE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[user.id] = user;
    localStorage.setItem(BACKUP_USER_STORAGE_KEY, JSON.stringify(cache));
    localStorage.setItem(ACTIVE_USER_SESSION_KEY, user.id);
  } catch (e) {
    // Ignore quota issues
  }
}

/**
 * Retrieves cached active user if any
 */
export function getCachedActiveUser(): UserProfile | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_USER_SESSION_KEY);
    if (!activeId) return null;
    const raw = localStorage.getItem(BACKUP_USER_STORAGE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[activeId] || null;
  } catch (e) {
    return null;
  }
}

export function clearActiveUserSession(): void {
  localStorage.removeItem(ACTIVE_USER_SESSION_KEY);
  sessionStorage.removeItem("pepflick_session_unlocked");
}
