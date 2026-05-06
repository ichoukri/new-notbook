import type { TUser } from "@/core/types";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken?: string | null): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Reads access/refresh tokens from the URL fragment (set by auth-frontend after redirect-back),
 * persists them, and strips the fragment from the URL.
 */
export function consumeAuthFragment(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return false;

  const params = new URLSearchParams(hash.slice(1));
  const accessToken = params.get("accessToken");
  if (!accessToken) return false;

  const refreshToken = params.get("refreshToken");
  setStoredTokens(accessToken, refreshToken);

  params.delete("accessToken");
  params.delete("refreshToken");
  const remaining = params.toString();
  const newHash = remaining ? `#${remaining}` : "";
  const newUrl = window.location.pathname + window.location.search + newHash;
  window.history.replaceState(null, "", newUrl);

  return true;
}

export function getUserDisplayName(user: TUser | null | undefined): string {
  if (!user) return "Unknown User";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email || user.username || user.id;
}

export function getUserInitials(user: TUser | null | undefined): string {
  if (!user) return "NA";
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  if (initials) return initials.toUpperCase();
  const fallback = user.email || user.username || user.id || "";
  return fallback.slice(0, 2).toUpperCase() || "NA";
}
