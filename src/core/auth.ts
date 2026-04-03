import type {
  TAuthSession,
  TBackendTokenResponse,
  TBackendUser,
  TUser,
} from "@/core/types";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return window.atob(normalized + padding);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function mapBackendUser(user: TBackendUser): TUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    profileImage: user.profile_image ?? null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function decodeUserFromAccessToken(accessToken: string): TUser | null {
  const payload = parseJwtPayload(accessToken);
  if (!payload) {
    return null;
  }

  const expiresAt = typeof payload.exp === "number" ? payload.exp : null;
  if (expiresAt && expiresAt * 1000 <= Date.now()) {
    return null;
  }

  const id = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : "";
  const firstName =
    typeof payload.first_name === "string" ? payload.first_name : "";
  const lastName =
    typeof payload.last_name === "string" ? payload.last_name : "";

  if (!id || !email || !firstName || !lastName) {
    return null;
  }

  return {
    id,
    email,
    firstName,
    lastName,
    profileImage: null,
  };
}

export function mapTokenResponse(
  tokenResponse: TBackendTokenResponse,
): TAuthSession {
  const user = decodeUserFromAccessToken(tokenResponse.access_token);
  if (!user) {
    throw new Error(
      "Could not read the authenticated user from the access token.",
    );
  }

  return {
    user,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    tokenType: tokenResponse.token_type,
  };
}

export function getStoredAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): TUser | null {
  const accessToken = getStoredAccessToken();
  if (!accessToken) {
    return null;
  }

  const user = decodeUserFromAccessToken(accessToken);
  if (!user) {
    clearStoredAuth();
    return null;
  }

  return user;
}

export function hasStoredAuth(): boolean {
  return Boolean(getStoredUser());
}

export function persistAuth(session: TAuthSession): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function getUserDisplayName(user: TUser | null | undefined): string {
  if (!user) {
    return "Unknown User";
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.email;
}

export function getUserInitials(user: TUser | null | undefined): string {
  if (!user) {
    return "NA";
  }

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.trim();
  return (initials || user.email.slice(0, 2)).toUpperCase();
}
