export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightParts(text: string, query: string): string[] {
  if (!query.trim()) {
    return [text];
  }

  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (words.length === 0) {
    return [text];
  }

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  return text.split(regex);
}
