import type { TUser } from "@/core/types";

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
